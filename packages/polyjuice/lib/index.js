
const { normalizers } = require("ckb-js-toolkit");
const base = require("@ckb-lumos/base");
const { u32ToHex, UInt32LEToNumber, numberToUInt32LE, GodwokenUtils } = require("@godwoken-examples/godwoken");

function encodeArgs(to_id, value, data) {
  const call_kind = to_id > 0 ? 1 : 3;
  const data_buf = Buffer.from(data.slice(2), "hex");

  const value_buf = Buffer.alloc(32);
  value_buf.writeBigUInt64BE(value & BigInt("0xFFFFFFFFFFFFFFFF"), 24);
  value_buf.writeBigUInt64BE(value >> BigInt(64), 16);

  const data_size_buf = Buffer.alloc(4);
  data_size_buf.writeUInt32LE(data_buf.length);
  const total_size = 40 + data_buf.length;

  const buf = Buffer.alloc(total_size);

  // depth = 0
  buf[0] = 0;
  buf[1] = 0;
  // call kind
  buf[2] = call_kind;
  // not static call
  buf[3] = 0;
  value_buf.copy(buf, 4);
  data_size_buf.copy(buf, 36);
  data_buf.copy(buf, 40);
  return `0x${buf.toString("hex")}`;
}

class Polyjuice {
  constructor(
    client,
    {
      validator_code_hash = "0x20814f4f3ebaf8a297d452aa38dbf0f9cb0b2988a87cb6119c2497de817e7de9",
      sudt_id = 1,
      creator_account_id,
    }
  ) {
    this.client = client;
    this.validator_code_hash = validator_code_hash;
    this.sudt_id = sudt_id;
    this.creator_account_id = creator_account_id;
  }

  async getBalance(account_id) {
    return await this.client.getBalance(this.sudt_id, account_id);
  }
  async getTransactionCount(account_id) {
    return await this.client.getNonce(account_id);
  }

  // Utils functions
  accountIdToAddress(id) {
    return numberToUInt32LE(id) + "0".repeat(32);
  }
  addressToAccountId(address) {
    return UInt32LEToNumber(address);
  }
  calculateScriptHash(from_id, nonce) {
    const args = numberToUInt32LE(this.sudt_id)
          + numberToUInt32LE(from_id).slice(2)
          + numberToUInt32LE(nonce).slice(2);
    const script = {
      code_hash: this.validator_code_hash,
      hash_type: "data",
      args,
    };
    return base.utils.ckbHash(
      base.core.SerializeScript(normalizers.NormalizeScript(script))
    ).serializeJson();
  }

  generateTransaction(from_id, to_id, value, data, nonce) {
    const args = encodeArgs(to_id, value, data);
    const real_to_id = to_id > 0 ? to_id : this.creator_account_id;
    return {
      from_id: u32ToHex(from_id),
      to_id: u32ToHex(real_to_id),
      nonce: u32ToHex(nonce),
      args,
    };
  }
  async generateCreateCreatorAccountTransaction(from_id, nonce) {
    const script_args_buf = Buffer.alloc(4);
    script_args_buf.writeUInt32LE(this.sudt_id);
    const script = {
      code_hash: this.validator_code_hash,
      hash_type: "data",
      args: `0x${script_args_buf.toString("hex")}`,
    };
    return GodwokenUtils.createAccountRawL2Transaction(from_id, nonce, script);
  }
}


class SimpleStorage {
  static initCode() {
    return "0x60806040525b607b60006000508190909055505b610018565b60db806100266000396000f3fe60806040526004361060295760003560e01c806360fe47b114602f5780636d4ce63c14605b576029565b60006000fd5b60596004803603602081101560445760006000fd5b81019080803590602001909291905050506084565b005b34801560675760006000fd5b50606e6094565b6040518082815260200191505060405180910390f35b8060006000508190909055505b50565b6000600060005054905060a2565b9056fea2646970667358221220044daf4e34adffc61c3bb9e8f40061731972d32db5b8c2bc975123da9e988c3e64736f6c63430006060033";
  }
  static _setMethod() { return "0x60fe47b1"; }
  static setValue(value) {
    const valueBigInt = BitInt(value);
    return _setMethod() + value.toString(16).padStart(64, '0');
  }
  static setValueHex(valueHex) {
    return _setMethod() + valueHex.slice(2);
  }
  static getValue() { return "0x6d4ce63c"; }
}

module.exports = {
  Polyjuice,
  SimpleStorage,
};
