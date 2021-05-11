#!/usr/bin/env node
import { Command } from "commander";
import { Indexer } from "@ckb-lumos/indexer";
import { key } from "@ckb-lumos/hd";
import { RPC } from "ckb-js-toolkit";
import path from "path";
import { initializeConfig } from "@ckb-lumos/config-manager";
import { withdrawCLI } from "../modules/godwoken"
import { ckbAddressToLockHash, privateKeyToEthAddress } from "../modules/utils"
import { initConfigAndSync } from "./common";

async function withdrawal(
    rpc: RPC,
    godwokenURL: string,
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
        godwokenURL,
        fromId,
        BigInt(capacity),
        BigInt(amount),
        sudtScriptHash,
        l2LockHash,
        ownerLockHash,
        privateKey,
    )
}

export const run = async (program: Command) => {
  const ckbRpc = program.rpc;
  const indexerPath = program.indexerPath;
  const _indexer = await initConfigAndSync(ckbRpc, indexerPath)

  const capacity = program.capacity;
  const amount = program.amount;
  const sudtScriptHash = program.sudtScriptHash;
  // const ownerLockHash = program.ownerLockHash;
  const ownerCkbAddress = program.ownerCkbAddress;
  const ownerLockHash = ckbAddressToLockHash(ownerCkbAddress);
  console.log("owner lock hash:", ownerLockHash);
  const fromId = program.fromId;

  const privateKey = program.privateKey;

  const publicKey = key.privateToPublic(privateKey);
  console.log("public key:", publicKey)
  console.log("eth address:", privateKeyToEthAddress(privateKey));

  const godwokenRPC = new RPC(program.godwokenRpc);
  try {
    await withdrawal(
      godwokenRPC,
      program.godwokenRpc,
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
