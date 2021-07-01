import { normalizers, Reader } from "ckb-js-toolkit";
import { core as base_core, Script, utils } from "@ckb-lumos/base";
import { scriptToAddress } from "@ckb-lumos/helpers";
import { getConfig } from "@ckb-lumos/config-manager";
import {
  GodwokenUtils,
  RawL2Transaction,
  toBuffer,
} from "@godwoken-examples/godwoken";
import * as secp256k1 from "secp256k1";
const keccak256 = require("keccak256");

export function generateLockScript(privateKey: any) {
  const privateKeyBuffer = new Reader(privateKey).toArrayBuffer();
  const publicKeyArray = secp256k1.publicKeyCreate(
    new Uint8Array(privateKeyBuffer)
  );
  const publicKeyHash = utils
    .ckbHash(publicKeyArray.buffer)
    .serializeJson()
    .substr(0, 42);
  const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
  const script = {
    code_hash: scriptConfig.CODE_HASH,
    hash_type: scriptConfig.HASH_TYPE,
    args: publicKeyHash,
  };
  return script;
}

export function ckbAddress(privateKey: any) {
  const script = generateLockScript(privateKey);
  return scriptToAddress(script);
}

export function ethAddress(privkey: any) {
  const privateKeyBuffer = new Reader(privkey).toArrayBuffer();
  const publicKeyArray = secp256k1.publicKeyCreate(
    new Uint8Array(privateKeyBuffer),
    false
  );
  const addr = `0x${keccak256(toBuffer(publicKeyArray.buffer).slice(1))
    .slice(12)
    .toString("hex")}`;
  console.log("EthAddress:", addr);
  return addr;
}

export function accountScriptHash(privkey: any) {
  const script: Script = {
    code_hash:
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    hash_type: "data",
    args: ethAddress(privkey),
  };
  return utils
    .ckbHash(base_core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

export function _signMessage(message: string, privkey: string) {
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

export function _generateTransactionMessageToSign(
  raw_l2tx: RawL2Transaction,
  rollup_type_hash: string,
  sender_script_hash: string,
  receiver_script_hash: string
) {
  console.log("RawL2Transaction", raw_l2tx);
  const godwoken_utils = new GodwokenUtils(rollup_type_hash);
  return godwoken_utils.generateTransactionMessageToSign(
    raw_l2tx,
    sender_script_hash,
    receiver_script_hash
  );
}

export function _createAccountRawL2Transaction(
  from_id: number,
  nonce: number,
  script_code_hash: string,
  script_args: string,
  sudt_id: number = 1,
  fee_amount: bigint = BigInt(0)
) {
  const script: Script = {
    code_hash: script_code_hash,
    hash_type: "type",
    args: script_args,
  };
  return GodwokenUtils.createAccountRawL2Transaction(
    from_id,
    nonce,
    script,
    sudt_id,
    fee_amount
  );
}
