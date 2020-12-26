const { RPC, Reader } = require("ckb-js-toolkit");
const { utils } = require("@ckb-lumos/base");
const keccak256 = require('keccak256');
const {
  NormalizeL2Transaction,
  NormalizeRawL2Transaction,
  NormalizeCreateAccount,
} = require("./normalizer");

function numberToUInt32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value);
  return `0x${buf.toString("hex")}`;
}

function UInt32ToNumber(hex) {
  const buf = Buffer.from(hex.slice(2), "hex");
  return buf.readUInt32LE(0);
}

class Godwoken {
  constructor(url) {
    this.rpc = new RPC(url);
  }

  async _send(l2tx, method) {
    const data = new Reader(core.SerializeL2Transaction(
      NormalizeL2Transaction(l2tx)
    )).serializeJson();
    return await method(data);
  }

  async execute(l2tx) {
    return this._send(l2tx, this.rpc.gw_executeL2Tranaction);
  }
  async submitL2Transaction(l2tx) {
    return this._send(l2tx, this.rpc.gw_submitL2Transaction);
  }
  async getStorageAt(account_id, key) {
    return await this.rpc.gw_getStorageAt(account_id, key);
  }
  async getSudtBalance(sudt_id, account_id) {
    return await this.rpc.gw_getBalance(sudt_id, account_id);
  }
  async getNonce(account_id) {
    return await this.rpc.gw_getNonce(account_id);
  }

  generateMessageToSign(raw_l2tx, privkey) {
    const prefix_buf = Buffer.from(`\x19Ethereum Signed Message:\n${raw_tx_data.length}`);
    const raw_tx_data = core.SerializeRawL2Transaction(NormalizeRawL2Transaction(raw_l2tx));
    const buf = Buffer.concat([prefix_buf, raw_tx_data]);
    return `0x${keccak256(buf).toString("hex")}`;
  }
  createAccountRawL2Transaction(from_id, nonce, script) {
    const create_account = { script };
    const enum_tag = "0x00000000";
    const create_account_part = new Reader(core.SerializeCreateAccount(
      NormalizeCreateAccount(create_account)
    )).serializeJson();
    const args = enum_tag + create_account_part.slice(2);
    return {
      from_id: numberToUInt32(from_id),
      to_id: numberToUInt32(0),
      nonce: numberToUInt32(nonce),
      args,
    };
  }
}

module.exports = {
  Godwoken,
  numberToUInt32,
  UInt32ToNumber,
};
