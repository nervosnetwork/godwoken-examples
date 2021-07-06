import {
  DeploymentConfig,
  deploymentConfig,
} from "../modules/deployment-config";
import { HexString, Script, Hash, utils } from "@ckb-lumos/base";
import { Indexer } from "@ckb-lumos/indexer";
import {
  TransactionSkeleton,
  parseAddress,
  sealTransaction,
  generateAddress,
} from "@ckb-lumos/helpers";
import {
  generateDepositLock,
  DepositLockArgs,
  getDepositLockArgs,
  serializeArgs,
  getRollupTypeHash,
} from "../modules/deposit";
import { common, sudt } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { RPC } from "ckb-js-toolkit";
import commander from "commander";
import {
  privateKeyToCkbAddress,
  privateKeyToEthAddress,
} from "../modules/utils";
import { initConfigAndSync, waitForDeposit, waitTxCommitted } from "./common";
import { Godwoken } from "@godwoken-examples/godwoken";
import {
  getBalanceByScriptHash,
  ethAddressToScriptHash,
} from "../modules/godwoken";

async function sendTx(
  godwoken: Godwoken,
  deploymentConfig: DeploymentConfig,
  fromAddress: string,
  amount: string,
  layer2LockArgs: HexString,
  indexer: Indexer,
  privateKey: HexString,
  ckbUrl: string,
  sudtToken: HexString,
  capacity?: bigint
): Promise<[Hash, Hash]> {
  let txSkeleton = TransactionSkeleton({ cellProvider: indexer });

  const ownerLock: Script = parseAddress(fromAddress);
  const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);
  const layer2Lock: Script = {
    code_hash: deploymentConfig.eth_account_lock.code_hash,
    hash_type: deploymentConfig.eth_account_lock.hash_type as "data" | "type",
    args: getRollupTypeHash() + layer2LockArgs.slice(2),
  };
  const depositLockArgs: DepositLockArgs = getDepositLockArgs(
    ownerLockHash,
    layer2Lock
  );
  const l2ScriptHash = utils.computeScriptHash(depositLockArgs.layer2_lock);
  console.log(`Layer 2 lock script hash: ${l2ScriptHash}`);

  console.log("Your address:", l2ScriptHash.slice(0, 42));

  const serializedArgs: HexString = serializeArgs(depositLockArgs);
  const depositLock: Script = generateDepositLock(
    deploymentConfig,
    serializedArgs
  );

  const toAddress: string = generateAddress(depositLock);

  txSkeleton = await sudt.transfer(
    txSkeleton,
    [fromAddress],
    sudtToken,
    toAddress,
    BigInt(amount),
    undefined,
    capacity,
    undefined,
    {
      splitChangeCell: true,
    }
  );

  const sudtScriptHash = utils.computeScriptHash(
    txSkeleton.get("outputs").get(0)!.cell_output.type!
  );
  console.log(`Layer 1 sudt script hash:`, sudtScriptHash);

  const scriptHash = await godwoken.getScriptHash(1);
  const script = await godwoken.getScript(scriptHash);
  const layer2SudtScript = {
    code_hash: script.code_hash,
    hash_type: script.hash_type,
    args: getRollupTypeHash() + sudtScriptHash.slice(2),
  };
  console.log("layer 2 sudt script:", layer2SudtScript);
  const layer2SudtScriptHash = utils.computeScriptHash(layer2SudtScript);
  console.log(`Layer 2 sudt script hash:`, layer2SudtScriptHash);
  console.log("↑ Using this script hash to get sudt account id ↑");

  txSkeleton = await common.payFeeByFeeRate(
    txSkeleton,
    [fromAddress],
    BigInt(1000)
  );

  txSkeleton = common.prepareSigningEntries(txSkeleton);

  const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
  const content: HexString = key.signRecoverable(message, privateKey);

  const tx = sealTransaction(txSkeleton, [content]);

  const rpc = new RPC(ckbUrl);
  const txHash: Hash = await rpc.send_transaction(tx);

  return [txHash, layer2SudtScriptHash];
}

export const run = async (program: commander.Command) => {
  const ckbRpc = new RPC(program.rpc);
  const indexerPath = program.indexerPath;
  const indexer = await initConfigAndSync(program.rpc, indexerPath);

  const privateKey = program.privateKey;
  const ckbAddress = privateKeyToCkbAddress(privateKey);
  const ethAddress = program.ethAddress || privateKeyToEthAddress(privateKey);
  console.log("using eth address:", ethAddress);

  const capacity: bigint = BigInt(program.capacity);
  if (capacity < BigInt(40000000000)) {
    throw new Error("capacity can't less than 400 CKB");
  }

  const godwokenRpc = program.parent.godwokenRpc;
  const godwoken = new Godwoken(godwokenRpc);

  try {
    const [txHash, layer2SudtScriptHash] = await sendTx(
      godwoken,
      deploymentConfig,
      ckbAddress,
      program.amount,
      ethAddress.toLowerCase(),
      indexer,
      privateKey,
      program.rpc,
      program.sudtScriptArgs,
      capacity
    );

    console.log("txHash:", txHash);

    console.log("--------- wait for tx deposit ----------");

    await waitTxCommitted(txHash, ckbRpc);
    const accountScriptHash = ethAddressToScriptHash(ethAddress);
    const currentBalance = await getBalanceByScriptHash(
      godwoken,
      1,
      accountScriptHash
    );
    await waitForDeposit(
      godwoken,
      accountScriptHash,
      currentBalance,
      layer2SudtScriptHash
    );

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
