const { RPC, Reader } = require("ckb-js-toolkit");
const { utils } = require("@ckb-lumos/base");
const keccak256 = require('keccak256');
const {
  NormalizeL2Transaction,
  NormalizeRawL2Transaction,
  NormalizeCreateAccount,
} = require("./normalizer");
const core = require("../schemas");

function numberToUInt32LE(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value);
  return `0x${buf.toString("hex")}`;
}

function UInt32LEToNumber(hex) {
  const buf = Buffer.from(hex.slice(2, 10), "hex");
  return buf.readUInt32LE(0);
}

function u32ToHex(value) {
  return `0x${value.toString()}`;
}
function hexToU32(hex) {
  return parseInt(hex.slice(2), "hex");
}

function toBuffer(ab) {
  var buf = Buffer.alloc(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
}
function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

class Godwoken {
  constructor(url) {
    this.rpc = new RPC(url);
    this.utils = new GodwokenUtils();
  }

  async _send(l2tx, method) {
    const data = new Reader(core.SerializeL2Transaction(
      NormalizeL2Transaction(l2tx)
    )).serializeJson();
    return await method(data);
  }

  async executeL2Transaction(l2tx) {
    return this._send(l2tx, this.rpc.gw_executeL2Tranaction);
  }
  async submitL2Transaction(l2tx) {
    return this._send(l2tx, this.rpc.gw_submitL2Transaction);
  }
  async submitWithdrawalRequest(request) {
    // FIXME: todo
    return;
  }
  async getBalance(sudt_id, account_id) {
    // FIXME: swap later
    const hex = await this.rpc.gw_getBalance(account_id, sudt_id);
    return BigInt(hex);
  }
  async getStorageAt(account_id, key) {
    return await this.rpc.gw_getStorageAt(account_id, key);
  }
  async getAccountIdByScriptHash(script_hash) {
    return await this.rpc.gw_getAccountIdByScriptHash(script_hash);
  }
  async getNonce(account_id) {
    return await this.rpc.gw_getNonce(account_id);
  }
  async getScript(script_hash) {
    // FIXME: todo
    return {
      code_hash: "0x",
      hash_type: "data",
      args: "0x",
    };
  }
  async getScriptHash(account_id) {
    return await this.rpc.gw_getScriptHash(account_id);
  }
  async getData(data_hash) {
    // FIXME: todo
    return "0x";
  }
  async hasDataHash(data_hash) {
    // FIXME: todo
    return false;
  }
}

class GodwokenUtils {
  constructor(rollup_type_hash) {
    this.rollup_type_hash = rollup_type_hash;
  }

  generateTransactionMessageToSign(raw_l2tx) {
    const raw_tx_data = core.SerializeRawL2Transaction(NormalizeRawL2Transaction(raw_l2tx));
    const rollup_type_hash = Buffer.from(this.rollup_type_hash.slice(2), "hex");
    const data = toArrayBuffer(Buffer.concat([rollup_type_hash, toBuffer(raw_tx_data)]));
    const message = utils.ckbHash(data).serializeJson();
    const prefix_buf = Buffer.from(`\x19Ethereum Signed Message:\n32`);
    const buf = Buffer.concat([prefix_buf, Buffer.from(message.slice(2), "hex")]);
    return `0x${keccak256(buf).toString("hex")}`;
  }
  static generateWithdrawalMessageToSign(raw_request) {
    // FIXME: todo
    return "0x";
  }
  static createAccountRawL2Transaction(from_id, nonce, script) {
    const create_account = { script };
    const enum_tag = "0x00000000";
    const create_account_part = new Reader(core.SerializeCreateAccount(
      NormalizeCreateAccount(create_account)
    )).serializeJson();
    const args = enum_tag + create_account_part.slice(2);
    return {
      from_id: u32ToHex(from_id),
      to_id: u32ToHex(0),
      nonce: u32ToHex(nonce),
      args,
    };
  }
}


module.exports = {
  Godwoken,
  GodwokenUtils,
  numberToUInt32LE,
  UInt32LEToNumber,
  u32ToHex,
  hexToU32,
  toBuffer,
};
