import { initializeConfig } from "@ckb-lumos/config-manager";
import path from "path";
import { Indexer } from "@ckb-lumos/indexer";
import { env } from "process";
import { RPC } from "ckb-js-toolkit";
import { Godwoken } from "@godwoken-examples/godwoken";

import { asyncSleep } from "../modules/utils";
import { Hash } from "@ckb-lumos/base";

export async function initConfigAndSync(
  ckbRpc: string,
  indexerPath: string
): Promise<Indexer> {
  if (!env.LUMOS_CONFIG_NAME && !env.LUMOS_CONFIG_FILE) {
    env.LUMOS_CONFIG_NAME = "AGGRON4";
    console.log("LUMOS_CONFIG_NAME:", env.LUMOS_CONFIG_NAME);
  }
  if (env.LUMOS_CONFIG_FILE) {
    env.LUMOS_CONFIG_FILE = path.resolve(env.LUMOS_CONFIG_FILE);
    console.log("LUMOS_CONFIG_FILE:", env.LUMOS_CONFIG_FILE);
  }

  initializeConfig();

  indexerPath = path.resolve(indexerPath);
  const indexer = new Indexer(ckbRpc, indexerPath);
  indexer.startForever();

  console.log("waiting for sync ...");
  await indexer.waitForSync();
  console.log("synced ...");
  return indexer;
}

export async function waitTxCommitted(
  txHash: string,
  ckbRpc: RPC,
  timeout: number = 300,
  loopInterval = 3
) {
  for (let index = 0; index < timeout; index += loopInterval) {
    const txWithStatus = await ckbRpc.get_transaction(txHash);
    const status = txWithStatus.tx_status.status;
    console.log(`tx ${txHash} is ${status}, waited for ${index} seconds`);
    await asyncSleep(loopInterval * 1000);
    if (status === "committed") {
      console.log(`tx ${txHash} is committed!`);
      return;
    }
  }
  throw new Error(`tx ${txHash} not committed in ${timeout} seconds`);
}

export async function waitForDeposit(
  godwoken: Godwoken,
  accountScriptHash: Hash,
  originBalance: bigint,
  sudtScriptHash?: Hash, // if undefined, sudt id = 1
  timeout: number = 300,
  loopInterval = 5
) {
  let accountId = undefined;
  let sudtId = 1;
  for (let i = 0; i < timeout; i += loopInterval) {
    console.log(
      `waiting for layer 2 block producer collect the deposit cell ... ${i} seconds`
    );

    if (!accountId) {
      accountId = await godwoken.getAccountIdByScriptHash(accountScriptHash);
      if (!accountId) {
        await asyncSleep(loopInterval * 1000);
        continue;
      }
      console.log("Your account id:", accountId);
    }

    if (sudtScriptHash !== undefined && (!sudtId || sudtId === 1)) {
      sudtId = await godwoken.getAccountIdByScriptHash(sudtScriptHash);
      if (!sudtId) {
        await asyncSleep(loopInterval * 1000);
        continue;
      }
      console.log("Your sudt id:", sudtId);
    }

    const godwokenCkbBalance = await godwoken.getBalance(1, accountId);
    console.log(`ckb balance in godwoken is: ${godwokenCkbBalance}`);
    if (originBalance !== godwokenCkbBalance) {
      if (sudtId !== 1) {
        const godwokenSudtBalance = await godwoken.getBalance(
          sudtId,
          accountId
        );
        console.log(`sudt balance in godwoken is: ${godwokenSudtBalance}`);
      }
      console.log(`deposit success!`);
      return;
    }
    await asyncSleep(loopInterval * 1000);
  }

  console.log(
    `timeout for waiting deposit success in godwoken, please check with account id: ${accountId} by your self.`
  );
}

export async function waitForWithdraw(
  godwoken: Godwoken,
  accountScriptHash: Hash,
  originBalance: bigint,
  timeout: number = 300,
  loopInterval = 5
) {
  let accountId = undefined;
  for (let i = 0; i < timeout; i += loopInterval) {
    console.log(
      `waiting for layer 2 block producer withdrawal ... ${i} seconds`
    );

    if (!accountId) {
      accountId = await godwoken.getAccountIdByScriptHash(accountScriptHash);
      if (!accountId) {
        await asyncSleep(loopInterval * 1000);
        continue;
      }
      console.log("Your account id:", accountId);
    }

    const godwokenCkbBalance = await godwoken.getBalance(1, accountId);
    console.log(`ckb balance in godwoken is: ${godwokenCkbBalance}`);
    if (originBalance !== godwokenCkbBalance) {
      console.log(`withdrawal success!`);
      return;
    }
    await asyncSleep(loopInterval * 1000);
  }

  console.log(
    `timeout for waiting withdraw success in godwoken, please check with account id: ${accountId} by your self.`
  );
}
