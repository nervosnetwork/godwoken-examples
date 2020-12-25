const { RPC, Reader } = require("ckb-js-toolkit");
const { utils } = require("@ckb-lumos/base");
const secp256k1 = require("secp256k1");

class Godwoken {
  constructor(url) {
    this.rpc = new RPC(url);
  }

  async _send(l2tx, method) {
    // FIXME: normalize L2Transaction first
    const data = new Reader(core.SerializeL2Transaction(l2tx)).serializeJson();
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

  signRawL2Transaction(raw_l2tx, privkey) {
    const data = "FIXME: normalize raw_l2tx";
    const message = utils.ckbHash(data);
    const signObject = secp256k1.ecdsaSign(
      new Uint8Array(new Reader(message).toArrayBuffer()),
      new Uint8Array(new Reader(privkey).toArrayBuffer())
    );
    const signatureBuffer = new ArrayBuffer(65);
    const signatureArray = new Uint8Array(signatureBuffer);
    signatureArray.set(signObject.signature, 0);
    signatureArray.set([signObject.recid], 64);
    const signature = new Reader(signatureBuffer).serializeJson();
  }
  createAccountRawL2Transaction(from_id, nonce, script) {
    const create_account = { script };
    // FIXME: normalize createAccount;
    const enum_tag = "0x00000000";
    const args = enum_tag + "normalize(create_account)";
    return { from_id, to_id: 0, nonce, args };
  }
}
