#!/usr/bin/env node
import { Command } from "commander";
import { HexString, utils } from "@ckb-lumos/base";
import { Indexer } from "@ckb-lumos/indexer";
import {
  generateAddress, parseAddress,
} from "@ckb-lumos/helpers";
import { key } from "@ckb-lumos/hd";
import { RPC } from "ckb-js-toolkit";
import path from "path";
import { getConfig, initializeConfig } from "@ckb-lumos/config-manager";
import crypto from "crypto";
import keccak256 from "keccak256";
import { transferCLI, withdrawCLI } from "../js/godwoken"

const program = new Command();
program.version("0.0.1");

program
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-m, --amount <amount>", "capacity in shannons / amount in sudt")
  .requiredOption("-e, --fee <fee>", "fee")
  .requiredOption("-f, --from-id <from id>", "from id")
  .requiredOption("-t, --to-id <to id>", "to id")
  .requiredOption("-s, --sudt-id <sudt id>", "sudt id")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option("-g, --godwoken-rpc <godwoken rpc>", "godwoken rpc path", "http://127.0.0.1:8119")
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
program.parse(process.argv);

function _privateKeyToCkbAddress(privateKey: HexString): string {
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

function _privateKeyToEthAddress(privateKey: HexString) {
  const ecdh = crypto.createECDH(`secp256k1`);
  ecdh.generateKeys();
  ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
  const publicKey: string = "0x" + ecdh.getPublicKey("hex", "uncompressed");
  console.log("eth public key:", publicKey);
  const ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return ethAddress;
}

function addressToLockHash(address: string): string {
  const lock = parseAddress(address);
  const lockHash = utils.computeScriptHash(lock);
  return lockHash;  
}

async function transfer(
  godwokenURL: string,
  privateKey: string,
  fromId: number,
  toId: number,
  sudtId: number,
  amount: bigint,
  fee: bigint,
) {
  return await transferCLI(
    godwokenURL,
    privateKey,
    fromId,
    toId,
    sudtId,
    amount,
    fee
  )
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

  const amount = program.amount;
  const fee = program.fee;
  const fromId = program.fromId;
  const toId = program.toId;
  const sudtId = program.sudtId;
  const godwokenURL = program.godwokenRpc;

  const privateKey = program.privateKey;

  const publicKey = key.privateToPublic(privateKey);
  console.log("public key:", publicKey)
  console.log("eth address:", _privateKeyToEthAddress(privateKey));

  try {
    await transfer(
      godwokenURL,
      privateKey,
      +fromId,
      +toId,
      +sudtId,
      BigInt(amount),
      BigInt(fee),
    )

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
