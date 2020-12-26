
const { UInt32LEToNumber, numberToUInt32LE } = require("@godwoken-examples/godwoken");

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
  input_size_buf.copy(buf, 36);
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

  async _send(method, from_id, to_id, value, data, nonce, signature) {
    const args = encodeArgs(to_id, value, data);
    const real_to_id = to_id > 0 ? to_id : this.creator_account_id;
    const raw = {
      from_id: numberToUInt32(from_id),
      to_id: numberToUInt32(real_to_id),
      nonce: numberToUInt32(nonce),
      args,
    };
    const l2tx = { raw, signature };
    const run_result = await method(l2tx);
    return run_result.return_data;
  }

  async ethCall(from_id, to_id, value, data, nonce, signature) {
    return await this._send(
      this.client.executeL2Transaction,
      from_id, to_id, value, data, nonce, signature,
    );
  }
  async sendTransaction(from_id, to_id, value, data, nonce, signature) {
    return await this._send(
      this.client.submitL2Transaction,
      from_id, to_id, value, data, nonce, signature,
    );
  }
  async getBalance(account_id) {
    return await this.client.getBalance(this.sudt_id, account_id);
  }
  async getTransactionCount(account_id) {
    return await this.client.getNonce(account_id);
  }

  // Utils functions
  accountIdToAddress(id) {
    return numberToUInt32LE(id);
  }
  addressToAccountId(address) {
    return UInt32LEToNumber(address);
  }

  // High level functions
  async generateCreateCreatorAccountTransaction(from_id, nonce) {
    const script_args_buf = Buffer.alloc(4);
    script_args_buf.writeUInt32LE(this.sudt_id);
    const script = {
      code_hash: this.validator_code_hash,
      hash_type: "data",
      args: `0x${script_args_buf.toString("hex")}`,
    };
    return this.client.createAccountRawL2Transaction(from_id, nonce, script);
  }
}

module.exports = {
  Polyjuice
};
