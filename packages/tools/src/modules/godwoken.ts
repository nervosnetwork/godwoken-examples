import { Hash, HexString, utils } from "@ckb-lumos/base";
import {
  Godwoken,
  Uint32,
  Uint128,
  RawL2Transaction,
  GodwokenUtils,
  L2Transaction,
  WithdrawalRequest,
} from "@godwoken-examples/godwoken";
import {
  NormalizeSUDTTransfer,
  SUDTTransfer,
  UnoinType,
} from "@godwoken-examples/godwoken/lib/normalizer";
import { SerializeSUDTArgs } from "@godwoken-examples/godwoken/schemas";
import { Reader } from "ckb-js-toolkit";
import { getRollupTypeHash } from "./deposit";

import * as secp256k1 from "secp256k1";
import { privateKeyToEthAddress } from "./utils";
import { deploymentConfig } from "./deployment-config";
import { ROLLUP_TYPE_HASH } from "./godwoken-config";

export async function withdrawCLI(
  godwoken: Godwoken,
  fromId: Uint32,
  capacity: bigint,
  amount: bigint,
  sudtScriptHash: Hash,
  accountScriptHash: Hash,
  ownerLockHash: Hash,
  privateKey: string
) {
  console.log("--- godwoken withdraw ---");

  const nonce: Uint32 = await godwoken.getNonce(fromId);
  console.log("nonce:", nonce);

  const rawWithdrawalRequest = GodwokenUtils.createRawWithdrawalRequest(
    nonce,
    capacity,
    amount,
    sudtScriptHash,
    accountScriptHash,
    BigInt(0),
    BigInt(100 * 10 ** 8),
    ownerLockHash,
    "0x" + "0".repeat(64)
  );

  // console.log("rawWithdrawalRequest:", rawWithdrawalRequest);

  const godwokenUtils = new GodwokenUtils(getRollupTypeHash());
  const message = godwokenUtils.generateWithdrawalMessageToSign(
    rawWithdrawalRequest
  );

  // console.log("message:", message);

  let signature: HexString = signMessage(message, privateKey);
  let v = Number.parseInt(signature.slice(-2), 16);
  if (v >= 27) v -= 27;
  signature = signature.slice(0, -2) + v.toString(16).padStart(2, "0");

  // console.log("web3 signature:", signature);

  const withdrawalRequest: WithdrawalRequest = {
    raw: rawWithdrawalRequest,
    signature: signature,
  };

  console.log("withdrawalRequest:", withdrawalRequest);

  const result = await godwoken.submitWithdrawalRequest(withdrawalRequest);
  console.log("result:", result);

  if (result !== null) {
    const errorMessage = (result as any).message;
    if (errorMessage !== undefined && errorMessage !== null) {
      throw new Error(errorMessage);
    }
  }

  console.log("--- godwoken withdraw finished ---");
  return result;
}

export async function transferCLI(
  godwoken: Godwoken,
  privateKey: string,
  fromId: Uint32,
  toId: Uint32,
  sudtId: Uint32,
  amount: Uint128,
  fee: Uint128
) {
  console.log("--- godwoken sudt transfer ---");
  const nonce = await godwoken.getNonce(fromId);

  const sudtTransfer: SUDTTransfer = {
    to: "0x" + toId.toString(16),
    amount: "0x" + amount.toString(16),
    fee: "0x" + fee.toString(16),
  };

  const sudtArgs: UnoinType = {
    type: "SUDTTransfer",
    value: NormalizeSUDTTransfer(sudtTransfer),
  };

  const serializedSudtArgs = new Reader(
    SerializeSUDTArgs(sudtArgs)
  ).serializeJson();

  // console.log("serialized sudt args:", sudtArgs);

  const rawL2Transaction: RawL2Transaction = {
    from_id: "0x" + fromId.toString(16),
    to_id: "0x" + sudtId.toString(16),
    nonce: "0x" + BigInt(nonce).toString(16),
    args: serializedSudtArgs,
  };

  // console.log("rawL2Transaction:", rawL2Transaction);

  const rollupTypeHash: Hash = getRollupTypeHash();

  const senderScriptHash = await godwoken.getScriptHash(fromId);
  const receiverScriptHash = await godwoken.getScriptHash(sudtId);
  console.log("sender script hash:", senderScriptHash);
  console.log("receiver script hash:", receiverScriptHash);

  const godwokenUtils = new GodwokenUtils(rollupTypeHash);
  const message = godwokenUtils.generateTransactionMessageToSign(
    rawL2Transaction,
    senderScriptHash,
    receiverScriptHash
  );

  // console.log("message:", message);

  let signature: HexString = signMessage(message, privateKey);
  let v = Number.parseInt(signature.slice(-2), 16);
  if (v >= 27) v -= 27;
  signature = signature.slice(0, -2) + v.toString(16).padStart(2, "0");

  // console.log("signature:", signature);

  const l2Transaction: L2Transaction = {
    raw: rawL2Transaction,
    signature,
  };

  console.log("l2 transaction:", l2Transaction);

  const runResult = await godwoken.submitL2Transaction(l2Transaction);
  console.log("l2 tx hash:", runResult);

  if (runResult !== null) {
    const errorMessage: string | undefined = (runResult as any).message;
    if (errorMessage) {
      throw new Error(errorMessage);
    }
  }

  console.log("--- godwoken sudt transfer finished ---");
  return;
}

function signMessage(message: string, privkey: string) {
  const signObject = secp256k1.ecdsaSign(
    new Uint8Array(new Reader(message).toArrayBuffer()),
    new Uint8Array(new Reader(privkey).toArrayBuffer())
  );
  const signatureBuffer = new ArrayBuffer(65);
  const signatureArray = new Uint8Array(signatureBuffer);
  signatureArray.set(signObject.signature, 0);
  signatureArray.set([signObject.recid], 64);
  return new Reader(signatureBuffer).serializeJson();
}

export async function privateKeyToAccountId(
  godwoken: Godwoken,
  privateKey: HexString
): Promise<number | undefined> {
  const ethAddress = privateKeyToEthAddress(privateKey);
  const script = {
    ...deploymentConfig.eth_account_lock,
    args: ROLLUP_TYPE_HASH + ethAddress.slice(2),
  };

  const scriptHash = utils.computeScriptHash(script);

  const id = await godwoken.getAccountIdByScriptHash(scriptHash);

  return id;
}

export function privateKeyToScriptHash(privateKey: HexString): Hash {
  const ethAddress = privateKeyToEthAddress(privateKey);
  const script = {
    ...deploymentConfig.eth_account_lock,
    args: ROLLUP_TYPE_HASH + ethAddress.slice(2),
  };

  const scriptHash = utils.computeScriptHash(script);

  return scriptHash;
}

// export function privateKeyToScriptHash(
//   privateKey: HexString
// ): Hash {
//   const ethAddress = privateKeyToEthAddress(privateKey);
//   const script = {
//     ...deploymentConfig.eth_account_lock,
//     args: ROLLUP_TYPE_HASH + ethAddress.slice(2),
//   };

//   const scriptHash = utils.computeScriptHash(script);

//   return scriptHash;
// }

export function ethAddressToScriptHash(ethAddress: HexString): Hash {
  const script = {
    ...deploymentConfig.eth_account_lock,
    args: ROLLUP_TYPE_HASH + ethAddress.slice(2),
  };

  const scriptHash = utils.computeScriptHash(script);

  return scriptHash;
}

export async function getBalanceByScriptHash(
  godwoken: Godwoken,
  sudtId: number,
  scriptHash: Hash
): Promise<bigint> {
  const accountId = await godwoken.getAccountIdByScriptHash(scriptHash);
  if (!accountId) {
    return BigInt(0);
  }

  const balance = await godwoken.getBalance(sudtId, accountId);
  return balance;
}
