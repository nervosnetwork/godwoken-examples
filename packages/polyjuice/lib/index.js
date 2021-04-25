
const { normalizers } = require("ckb-js-toolkit");
const base = require("@ckb-lumos/base");
const { u32ToHex, UInt32LEToNumber, numberToUInt32LE, GodwokenUtils } = require("@godwoken-examples/godwoken");

// {gas_limit: u64, gas_price: u128, value: u128}
function encodeArgs(to_id, gas_limit, gas_price, value, data) {
  const call_kind = to_id > 0 ? 0 : 3;
  const data_buf = Buffer.from(data.slice(2), "hex");

  const gas_limit_buf = Buffer.alloc(8);
  gas_limit_buf.writeBigUInt64LE(gas_limit);

  const gas_price_buf = Buffer.alloc(16);
  gas_price_buf.writeBigUInt64LE(gas_price & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
  gas_price_buf.writeBigUInt64LE(gas_price >> BigInt(64), 8);

  const value_buf = Buffer.alloc(32);
  value_buf.writeBigUInt64BE(value & BigInt("0xFFFFFFFFFFFFFFFF"), 24);
  value_buf.writeBigUInt64BE(value >> BigInt(64), 16);

  const data_size_buf = Buffer.alloc(4);
  data_size_buf.writeUInt32LE(data_buf.length);
  const total_size = 62 + data_buf.length;

  const buf = Buffer.alloc(total_size);

  buf[0] = call_kind;
  // not static call
  buf[1] = 0;
  gas_limit_buf.copy(buf, 2);
  gas_price_buf.copy(buf, 10);
  value_buf.copy(buf, 26);
  data_size_buf.copy(buf, 58);
  data_buf.copy(buf, 62);
  return `0x${buf.toString("hex")}`;
}

class Polyjuice {
  constructor(
    client,
    {
      validator_script_hash = "0x7563b2cfba14333cd6d74e7ad5abafc7b27cb1483185da3842ad99331c111e14",
      sudt_id = 1,
      creator_account_id,
    }
  ) {
    this.client = client;
    this.validator_script_hash = validator_script_hash;
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
      code_hash: this.validator_script_hash,
      hash_type: "data",
      args,
    };
    return base.utils.ckbHash(
      base.core.SerializeScript(normalizers.NormalizeScript(script))
    ).serializeJson();
  }

  generateTransaction(from_id, to_id, gas_limit, gas_price, value, data, nonce) {
    const args = encodeArgs(to_id, gas_limit, gas_price, value, data);
    const real_to_id = to_id > 0 ? to_id : this.creator_account_id;
    return {
      from_id: u32ToHex(from_id),
      to_id: u32ToHex(real_to_id),
      nonce: u32ToHex(nonce),
      args,
    };
  }
  async generateCreateCreatorAccountTransaction(rollup_type_hash, from_id, nonce) {
    const rollup_type_hash_buf = Buffer.from(rollup_type_hash.slice(2), "hex");
    const sudt_id_buf = Buffer.alloc(4);
    sudt_id_buf.writeUInt32LE(this.sudt_id);

    const script_args_buf = Buffer.alloc(36);
    rollup_type_hash_buf.copy(script_args_buf, 0);
    sudt_id_buf.copy(sudt_id_buf, 32);
    const script = {
      code_hash: this.validator_script_hash,
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
    const valueBigInt = BigInt(value);
    return SimpleStorage._setMethod() + value.toString(16).padStart(64, '0');
  }
  static setValueHex(valueHex) {
    return SimpleStorage._setMethod() + valueHex.slice(2);
  }
  static getValue() { return "0x6d4ce63c"; }
  static parseReturnData(hex) {
    return BigInt(hex);
  }
}

module.exports = {
  Polyjuice,
  SimpleStorage,
};
