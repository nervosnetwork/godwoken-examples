#!/usr/bin/env node
import { Command } from "commander";
import { key } from "@ckb-lumos/hd";
import { privateKeyToAccountId, withdrawCLI } from "../modules/godwoken";
import { ckbAddressToLockHash, privateKeyToEthAddress } from "../modules/utils";
import { initConfigAndSync } from "./common";
import { Godwoken } from "@godwoken-examples/godwoken";

async function withdrawal(
  godwoken: Godwoken,
  privateKey: string,
  capacity: string,
  amount: string,
  sudtScriptHash: string,
  ownerLockHash: string
) {
  const fromId = await privateKeyToAccountId(godwoken, privateKey);
  const l2LockHash = await godwoken.getScriptHash(+fromId);
  console.log("l2 lock hash:", l2LockHash);
  return await withdrawCLI(
    godwoken,
    fromId,
    BigInt(capacity),
    BigInt(amount),
    sudtScriptHash,
    l2LockHash,
    ownerLockHash,
    privateKey
  );
}

export const run = async (program: Command) => {
  const ckbRpc = program.rpc;
  const indexerPath = program.indexerPath;
  const _indexer = await initConfigAndSync(ckbRpc, indexerPath);

  const capacity = program.capacity;
  const amount = program.amount;
  const sudtScriptHash = program.sudtScriptHash;
  // const ownerLockHash = program.ownerLockHash;
  const ownerCkbAddress = program.ownerCkbAddress;
  const ownerLockHash = ckbAddressToLockHash(ownerCkbAddress);
  console.log("owner lock hash:", ownerLockHash);

  const privateKey = program.privateKey;

  const publicKey = key.privateToPublic(privateKey);
  console.log("public key:", publicKey);
  console.log("eth address:", privateKeyToEthAddress(privateKey));

  const godwoken = new Godwoken(
    program.godwokenRPC,
    program.prefixWithGw === "true"
  );
  try {
    await withdrawal(
      godwoken,
      privateKey,
      capacity,
      amount,
      sudtScriptHash,
      ownerLockHash
    );

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
