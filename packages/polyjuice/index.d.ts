
import {Hash, HexString } from "@ckb-lumos/base"
import { Uint32, Uint64, Uint128, Uint256, Godwoken, RawL2Transaction } from "@godwoken-examples/godwoken";

export type U256 = HexString;
export type ETHAddress = HexString;

export declare class Polyjuice {
  constructor(
    client: Godwoken,
    config: {
      validator_code_hash: Hash,
      sudt_id: Uint32,
      creator_account_id: Uint32,
    }
  );

  getBalance(account_id: Uint32): Promise<Uint128>;
  getCode(account_id: Uint32): Promise<HexString>;
  getTransactionCount(account_id: Uint32): Promise<Uint32>;
  getStorageAt(account_id: Uint32, key: Hash): Promise<Hash>;
  // == Utils functions ==
  addressToAccountId(address: ETHAddress): Uint32;
  accountIdToAddress(id: Uint32): ETHAddress;
  calculateScriptHash(from_id: Uint32, nonce: Uint32, rollup_type_hash: string): Hash;

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
    nonce: Uint32,
    rollup_type_hash: string,
  ): RawL2Transaction;
  // Generate a RawL2Transaction for creating polyjuice base account (for creating polyjuice layer 2 account)
  generateCreateCreatorAccountTransaction(from_id: Uint32, nonce: Uint32): RawL2Transaction;
}

export declare class SimpleStorage {
  constructor();

  static initCode(): HexString;
  static setValue(value: Uint256): HexString;
  // set value use uint256 hex string
  static setValueHex(hexValue: HexString): HexString;
  static getValue(): HexString;
  static parseReturnData(hexValue: HexString): Uint256;
}
