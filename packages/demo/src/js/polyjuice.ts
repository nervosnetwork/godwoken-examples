import { Polyjuice } from "@godwoken-examples/polyjuice";
import {
  Godwoken,
  Uint32,
  Uint128,
  RawL2Transaction,
  GodwokenUtils,
} from "@godwoken-examples/godwoken";
import Config from "../configs/config.json";
import { Hash, HexString, Script, utils } from "@ckb-lumos/base";
import { sign } from "./utils/eth_sign";
import { L2Transaction } from "./base/normalizer";
import { getRollupTypeHash } from "./transactions/deposition";
const layer2LockConfig = Config.layer2_lock;
const polyjuiceConfig = Config.polyjuice;

const godwokenUrl = "http://localhost:8119";

export async function sendTransaction(
  sudtId: Uint32,
  creatorAccountId: Uint32,
  fromId: Uint32,
  toId: Uint32,
  value: Uint128,
  data: HexString
) {
  const godwoken = new Godwoken(godwokenUrl);
  const polyjuice = new Polyjuice(godwoken, {
    validator_code_hash: polyjuiceConfig.validator_code_hash,
    sudt_id: sudtId,
    creator_account_id: creatorAccountId,
  });

  const nonce: Uint32 = await godwoken.getNonce(fromId);

  const rawL2Transaction: RawL2Transaction = polyjuice.generateTransaction(
    fromId,
    toId,
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

  const runResult = await godwoken.submitL2Transaction(l2Transaction);

  return runResult;
}

function getLayer2LockScript(ethAddress: string): Script {
  return {
    code_hash: layer2LockConfig.code_hash,
    hash_type: layer2LockConfig.hash_type as "data" | "type",
    args: ethAddress,
  };
}

function getLayer2LockHash(ethAddress: string): Hash {
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

export async function getBalanceByEthAddress(
  sudtId: Uint32,
  ethAddress: string
): Promise<bigint> {
  const layer2LockHash: Hash = getLayer2LockHash(ethAddress);
  const accountId = await getAccountId(layer2LockHash);
  console.log("accountId:", accountId);
  const balance: bigint = await getBalance(sudtId, accountId);
  return balance;
}
