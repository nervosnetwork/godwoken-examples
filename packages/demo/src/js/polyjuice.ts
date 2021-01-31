import { Polyjuice } from "@godwoken-examples/polyjuice";
import {
  Godwoken,
  Uint32,
  Uint128,
  RawL2Transaction,
  GodwokenUtils,
  RunResult,
} from "@godwoken-examples/godwoken";
import Config from "../configs/config.json";
import { Hash, HexString, Script, utils } from "@ckb-lumos/base";
import { sign } from "./utils/eth_sign";
import { L2Transaction } from "@godwoken-examples/godwoken";
import { getRollupTypeHash } from "./transactions/deposition";
import { godwokenUrl } from "./url";
import { LocalNonce } from "./utils/nonce";

const layer2LockConfig = Config.layer2_lock;
const polyjuiceConfig = Config.polyjuice;

export async function submitL2Transaction(
  sudtId: Uint32,
  creatorAccountId: Uint32,
  fromId: Uint32,
  toId: Uint32,
  value: Uint128,
  data: HexString
): Promise<[RunResult, Hash, Uint32]> {
  console.log("--- polyjuice submit L2 transaction ---");

  const [
    l2Transaction,
    nonce,
    godwoken,
    polyjuice,
  ] = await generateL2Transaction(
    sudtId,
    creatorAccountId,
    fromId,
    toId,
    value,
    data
  );

  const runResult = await godwoken.submitL2Transaction(l2Transaction);
  console.log("runResult:", runResult);

  const scriptHash = polyjuice.calculateScriptHash(fromId, nonce);
  console.log("deployed script hash:", scriptHash);
  const contractAccountId = await godwoken.getAccountIdByScriptHash(scriptHash);
  console.log("contract account id:", contractAccountId);

  const errorMessage = (runResult as any).message;
  if (errorMessage !== undefined && errorMessage !== null) {
    throw new Error(errorMessage);
  }

  LocalNonce.increaseNonce();

  console.log("--- polyjuice submit L2 transaction finished ---");
  return [runResult, scriptHash, contractAccountId];
}

export async function executeL2Transaction(
  sudtId: Uint32,
  creatorAccountId: Uint32,
  fromId: Uint32,
  toId: Uint32,
  value: Uint128,
  data: HexString
): Promise<RunResult> {
  console.log("--- execute polyjuice transaction ---");

  const [
    l2Transaction,
    nonce,
    godwoken,
    polyjuice,
  ] = await generateL2Transaction(
    sudtId,
    creatorAccountId,
    fromId,
    toId,
    value,
    data
  );

  const runResult = await godwoken.executeL2Transaction(l2Transaction);
  console.log("runResult:", runResult);

  console.log("--- execute polyjuice transaction finished ---");
  return runResult;
}

export async function deployContract(
  sudtId: Uint32,
  creatorAccountId: Uint32,
  fromId: Uint32,
  value: Uint128,
  data: HexString
): Promise<[RunResult, Hash, Uint32]> {
  console.log("--- polyjuice deploy contract ---");

  const [
    l2Transaction,
    nonce,
    godwoken,
    polyjuice,
  ] = await generateL2Transaction(
    sudtId,
    creatorAccountId,
    fromId,
    0,
    value,
    data
  );

  const runResult = await godwoken.submitL2Transaction(l2Transaction);
  console.log("runResult:", runResult);

  const scriptHash = polyjuice.calculateScriptHash(fromId, nonce);
  console.log("deployed script hash:", scriptHash);
  const contractAccountId = await godwoken.getAccountIdByScriptHash(scriptHash);
  console.log("contract account id:", contractAccountId);

  const errorMessage = (runResult as any).message;
  if (errorMessage !== undefined && errorMessage !== null) {
    throw new Error(errorMessage);
  }

  LocalNonce.increaseNonce();

  console.log("--- polyjuice deploy contract finished ---");
  return [runResult, scriptHash, contractAccountId];
}

async function generateL2Transaction(
  sudtId: Uint32,
  creatorAccountId: Uint32,
  fromId: Uint32,
  toId: Uint32,
  value: Uint128,
  data: HexString
): Promise<[L2Transaction, Uint32, Godwoken, Polyjuice]> {
  const godwoken = new Godwoken(godwokenUrl);
  const polyjuice = new Polyjuice(godwoken, {
    validator_code_hash: polyjuiceConfig.validator_code_hash,
    sudt_id: sudtId,
    creator_account_id: creatorAccountId,
  });

  const nonce: Uint32 = await LocalNonce.getNonce(fromId, godwoken);
  console.log("nonce:", nonce);

  const rawL2Transaction: RawL2Transaction = polyjuice.generateTransaction(
    fromId,
    toId,
    // TODO: gas_limit
    0n,
    // TODO: gas_price
    0n,
    value,
    data,
    nonce
  );

  const rollupTypeHash: Hash = getRollupTypeHash();
  const godwokenUtils = new GodwokenUtils(rollupTypeHash);
  const message = godwokenUtils.generateTransactionMessageToSign(
    rawL2Transaction
  );

  const signature: HexString = await sign(message);

  const l2Transaction: L2Transaction = {
    raw: rawL2Transaction,
    signature,
  };

  console.log("l2 transaction:", l2Transaction);

  return [l2Transaction, nonce, godwoken, polyjuice];
}

function getLayer2LockScript(ethAddress: string): Script {
  return {
    code_hash: layer2LockConfig.code_hash,
    hash_type: layer2LockConfig.hash_type as "data" | "type",
    args: ethAddress,
  };
}

export function getLayer2LockHash(ethAddress: string): Hash {
  return utils.computeScriptHash(getLayer2LockScript(ethAddress));
}

async function getAccountId(layer2LockHash: Hash): Promise<Uint32> {
  const godwoken = new Godwoken(godwokenUrl);
  const accountId = await godwoken.getAccountIdByScriptHash(layer2LockHash);
  return accountId;
}

export async function getBalance(
  sudtId: Uint32,
  accountId: Uint32
): Promise<bigint> {
  const godwoken = new Godwoken(godwokenUrl);
  const amount = await godwoken.getBalance(sudtId, accountId);
  return amount;
}

export async function getAccountIdByEthAddress(
  ethAddress: string
): Promise<Uint32> {
  const layer2LockHash: Hash = getLayer2LockHash(ethAddress);
  return getAccountId(layer2LockHash);
}

export async function getBalanceByEthAddress(
  sudtId: Uint32,
  ethAddress: string
): Promise<bigint> {
  const layer2LockHash: Hash = getLayer2LockHash(ethAddress);
  const accountId = await getAccountId(layer2LockHash);
  console.log("accountId:", accountId);
  if (accountId === undefined || accountId === null) {
    throw new Error("Please deposit to create a godwoken account first.");
  }
  const balance: bigint = await getBalance(sudtId, accountId);
  return balance;
}
