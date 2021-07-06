#!/usr/bin/env node
import { Command } from "commander";
import {
  ethAddressToScriptHash,
  getBalanceByScriptHash,
  privateKeyToAccountId,
  withdrawCLI,
} from "../modules/godwoken";
import { ckbAddressToLockHash, privateKeyToEthAddress } from "../modules/utils";
import { initConfigAndSync, waitForWithdraw } from "./common";
import { Godwoken } from "@godwoken-examples/godwoken";

async function withdrawal(
  godwoken: Godwoken,
  privateKey: string,
  capacity: string,
  amount: string,
  sudtScriptHash: string,
  ownerLockHash: string,
  feeSudtId: number,
  feeAmount: bigint
) {
  const fromId = await privateKeyToAccountId(godwoken, privateKey);
  if (!fromId) {
    console.error("from id not found!");
    process.exit(-1);
  }
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
    privateKey,
    feeSudtId,
    feeAmount
  );
}

export const run = async (program: Command) => {
  const ckbRpc = program.rpc;
  const indexerPath = program.indexerPath;
  const _indexer = await initConfigAndSync(ckbRpc, indexerPath);

  const feeSudtId = +program.feeSudtId;
  const feeAmount = BigInt(program.fee);

  const capacity = program.capacity;
  const amount = program.amount;
  const sudtScriptHash = program.sudtScriptHash;
  // const ownerLockHash = program.ownerLockHash;
  const ownerCkbAddress = program.ownerCkbAddress;
  const ownerLockHash = ckbAddressToLockHash(ownerCkbAddress);
  console.log("owner lock hash:", ownerLockHash);

  const privateKey = program.privateKey;

  // const publicKey = key.privateToPublic(privateKey);
  // console.log("public key:", publicKey);
  const ethAddress = privateKeyToEthAddress(privateKey);
  console.log("eth address:", ethAddress);
  const accountScriptHash = ethAddressToScriptHash(ethAddress);

  const godwoken = new Godwoken(program.parent.godwokenRpc);
  try {
    await withdrawal(
      godwoken,
      privateKey,
      capacity,
      amount,
      sudtScriptHash,
      ownerLockHash,
      feeSudtId,
      feeAmount
    );

    const currentBalance = await getBalanceByScriptHash(
      godwoken,
      1,
      accountScriptHash
    );
    await waitForWithdraw(godwoken, accountScriptHash, currentBalance);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
