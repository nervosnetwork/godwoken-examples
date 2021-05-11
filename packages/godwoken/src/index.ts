import { RPC, Reader } from "ckb-js-toolkit";
import { Hash, HexString, Script, utils } from "@ckb-lumos/base";
import {
  NormalizeL2Transaction,
  NormalizeRawL2Transaction,
  NormalizeCreateAccount,
  NormalizeWithdrawalRequest,
  NormalizeRawWithdrawalRequest,
} from "./normalizer";
import core from "../schemas";
import {
  L2Transaction,
  RawL2Transaction,
  RawWithdrawalRequest,
  WithdrawalRequest,
  RunResult,
  Uint128,
  Uint32,
  Uint64,
} from "./types";
import keccak256 from "keccak256";

export function numberToUInt32LE(value: number): HexString {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value);
  return `0x${buf.toString("hex")}`;
}

export function UInt32LEToNumber(hex: HexString): number {
  const buf = Buffer.from(hex.slice(2, 10), "hex");
  return buf.readUInt32LE(0);
}

export function u32ToHex(value: number): HexString {
  return `0x${value.toString(16)}`;
}

export function hexToU32(hex: HexString): number {
  // return parseInt(hex.slice(2), "hex");
  return +hex;
}

export function toBuffer(ab: ArrayBuffer): Buffer {
  const buf = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
}

function toArrayBuffer(buf: Buffer) {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

export class Godwoken {
  private rpc: RPC;
  private utils: GodwokenUtils;

  constructor(url: string) {
    this.rpc = new RPC(url);
    this.utils = new GodwokenUtils("");
  }

  async _send(l2tx: L2Transaction, method: any) {
    const data = new Reader(
      core.SerializeL2Transaction(NormalizeL2Transaction(l2tx))
    ).serializeJson();
    return await method(data);
  }

  async executeL2Transaction(l2tx: L2Transaction): Promise<RunResult> {
    return this._send(l2tx, this.rpc.execute_l2transaction);
  }
  async submitL2Transaction(l2tx: L2Transaction): Promise<RunResult> {
    return this._send(l2tx, this.rpc.submit_l2transaction);
  }
  async submitWithdrawalRequest(request: WithdrawalRequest): Promise<void> {
    const data = new Reader(
      core.SerializeWithdrawalRequest(NormalizeWithdrawalRequest(request))
    ).serializeJson();
    return await this.rpc.submit_withdrawal_request(data);
  }
  async getBalance(sudt_id: Uint32, account_id: Uint32): Promise<Uint128> {
    // TODO: maybe swap params later?
    const sudt_id_hex = `0x${(+sudt_id).toString(16)}`;
    const account_id_hex = `0x${(+account_id).toString(16)}`;
    const hex = await this.rpc.get_balance(account_id_hex, sudt_id_hex);
    return BigInt(hex);
  }
  async getStorageAt(account_id: Uint32, key: Hash): Promise<Hash> {
    const account_id_hex = `0x${account_id.toString(16)}`;
    return await this.rpc.get_storage_at(account_id_hex, key);
  }
  async getAccountIdByScriptHash(script_hash: Hash): Promise<Uint32> {
    return await this.rpc.get_account_id_by_script_hash(script_hash);
  }
  async getNonce(account_id: Uint32): Promise<Uint32> {
    const account_id_hex = `0x${account_id.toString(16)}`;
    return parseInt(await this.rpc.get_nonce(account_id_hex));
  }
  async getScript(script_hash: Hash): Promise<Script> {
    return await this.rpc.get_script(script_hash);
  }
  async getScriptHash(account_id: Uint32): Promise<Hash> {
    const account_id_hex = `0x${account_id.toString(16)}`;
    return await this.rpc.get_script_hash(account_id_hex);
  }
  async getData(data_hash: Hash): Promise<HexString> {
    return await this.rpc.get_data(data_hash);
  }
  async hasDataHash(data_hash: Hash): Promise<boolean> {
    return await this.rpc.get_data_hash(data_hash);
  }
}

export class GodwokenUtils {
  private rollup_type_hash: Hash;

  constructor(rollup_type_hash: Hash) {
    this.rollup_type_hash = rollup_type_hash;
  }

  generateTransactionMessageWithoutPrefixToSign(
    raw_l2tx: RawL2Transaction,
    sender_script_hash: Hash,
    receiver_script_hash: Hash
  ): Hash {
    const raw_tx_data = core.SerializeRawL2Transaction(
      NormalizeRawL2Transaction(raw_l2tx)
    );
    const rollup_type_hash = Buffer.from(this.rollup_type_hash.slice(2), "hex");
    const senderScriptHash = Buffer.from(sender_script_hash.slice(2), "hex");
    const receiverScriptHash = Buffer.from(
      receiver_script_hash.slice(2),
      "hex"
    );
    const data = toArrayBuffer(
      Buffer.concat([
        rollup_type_hash,
        senderScriptHash,
        receiverScriptHash,
        toBuffer(raw_tx_data),
      ])
    );
    const message = utils.ckbHash(data).serializeJson();
    return message;
  }

  generateTransactionMessageToSign(
    raw_l2tx: RawL2Transaction,
    sender_script_hash: Hash,
    receiver_script_hash: Hash
  ): Hash {
    const message = this.generateTransactionMessageWithoutPrefixToSign(
      raw_l2tx,
      sender_script_hash,
      receiver_script_hash
    );
    const prefix_buf = Buffer.from(`\x19Ethereum Signed Message:\n32`);
    const buf = Buffer.concat([
      prefix_buf,
      Buffer.from(message.slice(2), "hex"),
    ]);
    return `0x${keccak256(buf).toString("hex")}`;
  }

  generateWithdrawalMessageWithoutPrefixToSign(
    raw_request: RawWithdrawalRequest
  ): Hash {
    const raw_request_data = core.SerializeRawWithdrawalRequest(
      NormalizeRawWithdrawalRequest(raw_request)
    );
    const rollup_type_hash = Buffer.from(this.rollup_type_hash.slice(2), "hex");
    const data = toArrayBuffer(
      Buffer.concat([rollup_type_hash, toBuffer(raw_request_data)])
    );
    const message = utils.ckbHash(data).serializeJson();
    return message;
  }

  generateWithdrawalMessageToSign(raw_request: RawWithdrawalRequest): Hash {
    const message = this.generateWithdrawalMessageWithoutPrefixToSign(
      raw_request
    );
    const prefix_buf = Buffer.from(`\x19Ethereum Signed Message:\n32`);
    const buf = Buffer.concat([
      prefix_buf,
      Buffer.from(message.slice(2), "hex"),
    ]);
    return `0x${keccak256(buf).toString("hex")}`;
  }

  static createAccountRawL2Transaction(
    from_id: Uint32,
    nonce: Uint32,
    script: Script
  ): RawL2Transaction {
    const create_account = { script };
    const enum_tag = "0x00000000";
    const create_account_part = new Reader(
      core.SerializeCreateAccount(NormalizeCreateAccount(create_account))
    ).serializeJson();
    const args = enum_tag + create_account_part.slice(2);
    return {
      from_id: u32ToHex(from_id),
      to_id: u32ToHex(0),
      nonce: u32ToHex(nonce),
      args,
    };
  }

  static createRawWithdrawalRequest(
    nonce: Uint32,
    capacity: Uint64,
    amount: Uint128,
    sudt_script_hash: Hash,
    account_script_hash: Hash,
    sell_amount: Uint128,
    sell_capacity: Uint64,
    owner_lock_hash: Hash,
    payment_lock_hash: Hash
  ): RawWithdrawalRequest {
    return {
      nonce: "0x" + BigInt(nonce).toString(16),
      capacity: "0x" + BigInt(capacity).toString(16),
      amount: "0x" + BigInt(amount).toString(16),
      sudt_script_hash: sudt_script_hash,
      account_script_hash: account_script_hash,
      sell_amount: "0x" + BigInt(sell_amount).toString(16),
      sell_capacity: "0x" + BigInt(sell_capacity).toString(16),
      owner_lock_hash: owner_lock_hash,
      payment_lock_hash: payment_lock_hash,
    };
  }
}
