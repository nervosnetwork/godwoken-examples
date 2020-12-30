#!/usr/bin/env node
import { Command } from "commander";
import { DeploymentConfig } from "../js/base";
import { HexString, Script, Hash, utils } from "@ckb-lumos/base";
import { Indexer } from "@ckb-lumos/indexer";
import {
  TransactionSkeleton,
  parseAddress,
  sealTransaction,
  generateAddress,
} from "@ckb-lumos/helpers";
import {
  generateDepositionLock,
  DepositionLockArgs,
  getDepositionLockArgs,
  serializeArgs,
} from "../js/transactions/deposition";
import { common, sudt } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { RPC } from "ckb-js-toolkit";
import { getDeploymentConfig } from "../js/utils/deployment_config";
import path from "path";
import { getConfig, initializeConfig } from "@ckb-lumos/config-manager";
import crypto from "crypto";
import keccak256 from "keccak256";

const program = new Command();
program.version("0.0.1");

program
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-m --amount <amount>", "sudt amount")
  .requiredOption("-s --sudt-script-args <sudt script args>", "sudt amount")
  .option("-r, --rpc <rpc>", "rpc path", "http://127.0.0.1:8114")
  .option(
    "-g, --godwoken-rpc <rpc>",
    "godwoken rpc path",
    "http://127.0.0.1:8119"
  )
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .option(
    "-l, --eth-address <args>",
    "Eth address (layer2 lock args, using --private-key value to calculate if not provided)"
  )
  .option("-c, --capacity <capacity>", "capacity in shannons", "40000000000");

program.parse(process.argv);

function privateKeyToCkbAddress(privateKey: HexString): string {
  const publicKey = key.privateToPublic(privateKey);
  const publicKeyHash = key.publicKeyToBlake160(publicKey);
  const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
  const script = {
    code_hash: scriptConfig.CODE_HASH,
    hash_type: scriptConfig.HASH_TYPE,
    args: publicKeyHash,
  };
  const address = generateAddress(script);
  return address;
}

function privateKeyToEthAddress(privateKey: HexString) {
  const ecdh = crypto.createECDH(`secp256k1`);
  ecdh.generateKeys();
  ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
  const publicKey: string = "0x" + ecdh.getPublicKey("hex", "uncompressed");
  const ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return ethAddress;
}

async function sendTx(
  deploymentConfig: DeploymentConfig,
  fromAddress: string,
  amount: string,
  layer2LockArgs: HexString,
  indexer: Indexer,
  privateKey: HexString,
  ckbUrl: string,
  sudtToken: HexString,
  capacity?: bigint
): Promise<Hash> {
  let txSkeleton = TransactionSkeleton({ cellProvider: indexer });

  const ownerLock: Script = parseAddress(fromAddress);
  const ownerLockHash: Hash = utils.computeScriptHash(ownerLock);
  const depositionLockArgs: DepositionLockArgs = getDepositionLockArgs(
    ownerLockHash,
    layer2LockArgs
  );

  console.log(
    `Layer 2 lock script hash: ${utils.computeScriptHash(
      depositionLockArgs.layer2_lock
    )}`
  );

  const serializedArgs: HexString = serializeArgs(depositionLockArgs);
  const depositionLock: Script = generateDepositionLock(
    deploymentConfig,
    serializedArgs
  );

  const toAddress: string = generateAddress(depositionLock);

  // const outputCell: Cell = {
  //   cell_output: {
  //     capacity: "0x" + BigInt(amount).toString(16),
  //     lock: depositionLock,
  //   },
  //   data: "0x",
  // };

  txSkeleton = await sudt.transfer(
    txSkeleton,
    [fromAddress],
    sudtToken,
    toAddress,
    BigInt(amount),
    undefined,
    capacity
  );

  const sudtScriptHash = utils.computeScriptHash(
    txSkeleton.get("outputs").get(0)!.cell_output.type!
  );
  console.log(`Layer 1 sudt script hash:`, sudtScriptHash);

  const godwokenRpc = new RPC(program.godwokenRpc);
  const scriptHash = await godwokenRpc.gw_getScriptHash(1);
  const script = await godwokenRpc.gw_getScript(scriptHash);
  console.log(
    `Layer 2 sudt script hash:`,
    utils.computeScriptHash({
      code_hash: script.code_hash,
      hash_type: script.hash_type,
      args: sudtScriptHash,
    })
  );

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

  return txHash;
}

const run = async () => {
  if (process.env.LUMOS_CONFIG_FILE) {
    process.env.LUMOS_CONFIG_FILE = path.resolve(process.env.LUMOS_CONFIG_FILE);
  }

  console.log("LUMOS_CONFIG_FILE:", process.env.LUMOS_CONFIG_FILE);

  initializeConfig();

  const indexerPath = path.resolve(program.indexerPath);

  const indexer = new Indexer(program.rpc, indexerPath);
  indexer.startForever();

  console.log("waiting for sync ...");
  await indexer.waitForSync();
  console.log("synced ...");

  const deploymentConfig: DeploymentConfig = getDeploymentConfig();

  const privateKey = program.privateKey;
  const ckbAddress = privateKeyToCkbAddress(privateKey);
  const ethAddress = program.ethAddress || privateKeyToEthAddress(privateKey);
  console.log("using eth address:", ethAddress);

  const capacity: bigint = BigInt(program.capacity);
  if (capacity < BigInt(40000000000)) {
    throw new Error("capacity can't less than 400 CKB");
  }
  try {
    const txHash: Hash = await sendTx(
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

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
