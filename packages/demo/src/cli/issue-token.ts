#!/usr/bin/env node
import { Command } from "commander";
import { HexString, Hash } from "@ckb-lumos/base";
import { Indexer } from "@ckb-lumos/indexer";
import {
  TransactionSkeleton,
  sealTransaction,
  generateAddress,
} from "@ckb-lumos/helpers";
import { common, sudt } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { RPC } from "ckb-js-toolkit";
import path from "path";
import { getConfig, initializeConfig } from "@ckb-lumos/config-manager";

const program = new Command();
program.version("0.0.1");

program
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-m --amount <amount>", "sudt amount")
  .option("-r, --rpc <rpc>", "rpc path", "http://127.0.0.1:8114")
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .option("-c, --capacity <capacity>", "capacity in issued cell");

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

async function issueToken(
  amount: string,
  indexer: Indexer,
  privateKey: HexString,
  ckbUrl: string,
  capacity?: bigint
): Promise<Hash> {
  let txSkeleton = TransactionSkeleton({ cellProvider: indexer });

  const address: string = privateKeyToCkbAddress(privateKey);

  const sudtScriptArgs: HexString = sudt.ownerForSudt(address);
  console.log("sudt script args:", sudtScriptArgs);

  txSkeleton = await sudt.issueToken(
    txSkeleton,
    address,
    BigInt(amount),
    capacity
  );

  txSkeleton = await common.payFeeByFeeRate(
    txSkeleton,
    [address],
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

  const privateKey = program.privateKey;
  try {
    const txHash: Hash = await issueToken(
      program.amount,
      indexer,
      privateKey,
      program.rpc,
      program.capacity
    );

    console.log("txHash:", txHash);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
