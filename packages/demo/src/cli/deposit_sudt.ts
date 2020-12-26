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
import { initializeConfig } from "@ckb-lumos/config-manager";

const program = new Command();
program.version("0.0.1");

program
  .requiredOption("-a, --address <address>", "inputs from")
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-m --amount <amount>", "sudt amount")
  .requiredOption("-s --sudt-script-args <sudt script args>", "sudt amount")
  .option("-r, --rpc <rpc>", "rpc path", "http://127.0.0.1:8114")
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .option("-l, --eth-address <args>", "Eth address (layer2 lock args)", "0x")
  .option("-c, --capacity <capacity>", "capacity in shannons", "");

program.parse(process.argv);

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
  const serializedArgs: HexString = serializeArgs(
    depositionLockArgs,
    utils.computeScriptHash
  );
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

  const capacity: bigint | undefined =
    program.capacity === "" ? undefined : BigInt(program.capacity);
  try {
    const txHash: Hash = await sendTx(
      deploymentConfig,
      program.address,
      program.amount,
      program.ethAddress.toLowerCase(),
      indexer,
      program.privateKey,
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
