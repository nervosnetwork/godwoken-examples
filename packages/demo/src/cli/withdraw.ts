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
import { withdrawCLI } from "../js/godwoken"

const program = new Command();
program.version("0.0.1");

program
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-c, --capacity <capacity>", "capacity in shannons")
  .requiredOption("-s --sudt-script-hash <sudt script hash>", "l1 sudt script hash")
  .requiredOption("-o --owner-ckb-address <owner ckb address>", "owner ckb address (to)")
  .requiredOption("-f --from-id <from id>", "from id")
  .option("-m --amount <amount>", "amount of sudt", "0")
  .option("-r, --rpc <rpc>", "rpc path", "http://127.0.0.1:8114")
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

async function withdrawal(
    rpc: RPC,
    privateKey: string,
    capacity: string,
    amount: string,
    sudtScriptHash: string,
    ownerLockHash: string,
    fromId: number,
) {
    const l2LockHash = await rpc.get_script_hash("0x" + fromId.toString(16));
    console.log("l2 lock hash:", l2LockHash);
    return await withdrawCLI(
        fromId,
        BigInt(capacity),
        BigInt(amount),
        sudtScriptHash,
        l2LockHash,
        ownerLockHash,
        privateKey,
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

  const capacity = program.capacity;
  const amount = program.amount;
  const sudtScriptHash = program.sudtScriptHash;
  // const ownerLockHash = program.ownerLockHash;
  const ownerCkbAddress = program.ownerCkbAddress;
  const ownerLockHash = addressToLockHash(ownerCkbAddress);
  console.log("owner lock hash:", ownerLockHash);
  const fromId = program.fromId;

  const privateKey = program.privateKey;

  const publicKey = key.privateToPublic(privateKey);
  console.log("public key:", publicKey)
  console.log("eth address:", _privateKeyToEthAddress(privateKey));

  const rpc = new RPC(program.rpc);
  const godwokenRPC = new RPC(program.godwokenRpc);
  try {
    await withdrawal(
      godwokenRPC,
      privateKey,
      capacity,
      amount,
      sudtScriptHash,
      ownerLockHash,
      +fromId,
    )

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
