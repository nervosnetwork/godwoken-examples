import { Hash, utils, Script, HexString, HexNumber } from "@ckb-lumos/base";
import {
  u32ToHex,
  UInt32LEToNumber,
  numberToUInt32LE,
  GodwokenUtils,
  Uint32,
  Uint64,
  Uint128,
  Uint256,
  Godwoken,
  RawL2Transaction,
} from "@godwoken-examples/godwoken";
import { UInt128ToLeBytes, UInt32ToLeBytes, UInt64ToLeBytes } from "./types";
import { rlp } from "ethereumjs-util";
import keccak256 from "keccak256";

export type U256 = HexString;
export type ETHAddress = HexString;

const EMPTY_ETH_ADDRESS = "0x" + "00".repeat(20);

function encodeArgs(
  to_id: Uint32,
  gas_limit: Uint128,
  gas_price: Uint128,
  value: Uint128,
  data: HexString,
  creator_account_id: Uint32
): HexString {
  // header
  const args_0_7 =
    "0x" +
    Buffer.from("FFFFFF", "hex").toString("hex") +
    Buffer.from("POLY", "utf8").toString("hex");
  // gas limit
  const args_8_16 = UInt64ToLeBytes(BigInt(gas_limit));
  // gas price
  const args_16_32 = UInt128ToLeBytes(gas_price);
  // value
  const args_32_48 = UInt128ToLeBytes(BigInt(value));

  const dataByteLength = Buffer.from(data.slice(2), "hex").length;
  // data length
  const args_48_52 = UInt32ToLeBytes(dataByteLength);
  // data
  const args_data = data;

  let args_7 = "0x00";
  if (to_id === 0 || to_id === creator_account_id) {
    args_7 = "0x03";
  }

  const args =
    "0x" +
    args_0_7.slice(2) +
    args_7.slice(2) +
    args_8_16.slice(2) +
    args_16_32.slice(2) +
    args_32_48.slice(2) +
    args_48_52.slice(2) +
    args_data.slice(2);

  return args;
}

interface PolyjuiceConfig {
  validator_script_hash: Hash;
  sudt_id: Uint32;
  creator_account_id: Uint32;
}

export class Polyjuice {
  private client: Godwoken;
  private validator_script_hash: Hash;
  private sudt_id: Uint32;
  private creator_account_id: Uint32;

  constructor(
    client: Godwoken,
    { validator_script_hash, sudt_id, creator_account_id }: PolyjuiceConfig
  ) {
    this.client = client;
    this.validator_script_hash = validator_script_hash;
    this.sudt_id = sudt_id;
    this.creator_account_id = creator_account_id;
  }

  async getBalance(account_id: Uint32): Promise<Uint128> {
    return await this.client.getBalance(this.sudt_id, account_id);
  }

  async getTransactionCount(account_id: Uint32): Promise<Uint32> {
    return await this.client.getNonce(account_id);
  }

  // Utils functions
  accountIdToAddress(id: Uint32): ETHAddress {
    return numberToUInt32LE(id) + "0".repeat(32);
  }

  addressToAccountId(address: ETHAddress): Uint32 {
    return UInt32LEToNumber(address);
  }

  calculateScriptHash(
    rollup_type_hash: Hash,
    from_id: Uint32,
    nonce: Uint32
  ): Hash {
    const args =
      rollup_type_hash +
      numberToUInt32LE(this.creator_account_id).slice(2) +
      numberToUInt32LE(from_id).slice(2) +
      numberToUInt32LE(nonce).slice(2);
    const script: Script = {
      code_hash: this.validator_script_hash,
      hash_type: "type",
      args,
    };
    return utils.computeScriptHash(script);
  }

  generateTransaction(
    // The sender account id
    from_id: Uint32,
    // The target contract account id, 0 is for create contract
    to_id: Uint32,
    // The gas limit
    gas_limit: Uint64,
    // The gas price
    gas_price: Uint128,
    // The value to transfer to `to_id`
    value: Uint128,
    // The input data for `to_id` contract to execute
    data: HexString,
    // The nonce
    nonce: Uint32
  ): RawL2Transaction {
    const args = encodeArgs(
      to_id,
      gas_limit,
      gas_price,
      value,
      data,
      this.creator_account_id
    );
    const real_to_id = to_id > 0 ? to_id : this.creator_account_id;
    return {
      from_id: u32ToHex(from_id),
      to_id: u32ToHex(real_to_id),
      nonce: u32ToHex(nonce),
      args,
    };
  }

  generateCreateCreatorAccountTransaction(
    rollup_type_hash: Hash,
    from_id: Uint32,
    nonce: Uint32
  ): RawL2Transaction {
    const rollup_type_hash_buf = Buffer.from(rollup_type_hash.slice(2), "hex");
    const sudt_id_buf = Buffer.alloc(4);
    sudt_id_buf.writeUInt32LE(this.sudt_id);

    const script_args_buf = Buffer.alloc(36);
    rollup_type_hash_buf.copy(script_args_buf, 0);
    sudt_id_buf.copy(sudt_id_buf, 32);
    const script: Script = {
      code_hash: this.validator_script_hash,
      hash_type: "data",
      args: `0x${script_args_buf.toString("hex")}`,
    };
    return GodwokenUtils.createAccountRawL2Transaction(from_id, nonce, script);
  }

  calcMessage(
    to: ETHAddress,
    gas_limit: Uint128,
    gas_price: Uint128,
    value: Uint128,
    data: HexString,
    nonce: Uint32
  ): Hash {
    const r = "0x";
    const s = "0x";
    const v = numberToRlpEncode(toHex(this.creator_account_id));

    if (to === EMPTY_ETH_ADDRESS) {
      to = "0x";
    }

    const beforeEncode = [
      numberToRlpEncode(toHex(nonce)),
      numberToRlpEncode(toHex(gas_price)),
      numberToRlpEncode(toHex(gas_limit)),
      to,
      numberToRlpEncode(toHex(value)),
      data,
      v,
      r,
      s,
    ];

    const encodedBuffer = rlp.encode(beforeEncode);
    const encoded = "0x" + encodedBuffer.toString("hex");

    const message =
      "0x" + keccak256(Buffer.from(encoded.slice(2), "hex")).toString("hex");
    return message;
  }

  calcEthTxHash(
    to: ETHAddress,
    gas_limit: Uint128,
    gas_price: Uint128,
    value: Uint128,
    data: HexString,
    nonce: Uint32,
    signature: HexString
  ): Hash {
    const sigBuf = Buffer.from(signature.slice(2), "hex");
    const r = "0x" + sigBuf.slice(0, 32).toString("hex");
    const s = "0x" + sigBuf.slice(32, 64).toString("hex");
    const origin_v = "0x" + sigBuf.slice(64).toString("hex");
    const v = +origin_v + 35 + 2 * this.creator_account_id;

    if (to === EMPTY_ETH_ADDRESS) {
      to = "0x";
    }

    const beforeEncode = [
      numberToRlpEncode(toHex(nonce)),
      numberToRlpEncode(toHex(gas_price)),
      numberToRlpEncode(toHex(gas_limit)),
      to,
      numberToRlpEncode(toHex(value)),
      data,
      v,
      r,
      s,
    ];

    const encodedBuffer = rlp.encode(beforeEncode);
    const encoded = "0x" + encodedBuffer.toString("hex");

    const hash =
      "0x" + keccak256(Buffer.from(encoded.slice(2), "hex")).toString("hex");
    return hash;
  }
}

function toHex(num: number | bigint | HexNumber): HexNumber {
  return "0x" + BigInt(num).toString(16);
}

function numberToRlpEncode(num: HexString) {
  if (num === "0x0" || num === "0x") {
    return "0x";
  }

  return "0x" + BigInt(num).toString(16);
}

export class SimpleStorage {
  static initCode(): HexString {
    return "0x60806040525b607b60006000508190909055505b610018565b60db806100266000396000f3fe60806040526004361060295760003560e01c806360fe47b114602f5780636d4ce63c14605b576029565b60006000fd5b60596004803603602081101560445760006000fd5b81019080803590602001909291905050506084565b005b34801560675760006000fd5b50606e6094565b6040518082815260200191505060405180910390f35b8060006000508190909055505b50565b6000600060005054905060a2565b9056fea2646970667358221220044daf4e34adffc61c3bb9e8f40061731972d32db5b8c2bc975123da9e988c3e64736f6c63430006060033";
  }

  static _setMethod() {
    return "0x60fe47b1";
  }

  static setValue(value: Uint256): HexString {
    const valueBigInt = BigInt(value);
    return (
      SimpleStorage._setMethod() + valueBigInt.toString(16).padStart(64, "0")
    );
  }

  static setValueHex(valueHex: HexString): HexString {
    return SimpleStorage._setMethod() + valueHex.slice(2);
  }

  static getValue(): HexString {
    return "0x6d4ce63c";
  }

  static parseReturnData(hex: HexString): Uint256 {
    return BigInt(hex);
  }
}
