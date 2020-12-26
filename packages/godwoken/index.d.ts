
import { Map } from "immutable";

export type Uint32 = number;
export type Uint64 = bigint;
export type Uint128 = bigint;

import { HexNumber, HexString, Hash, Script } from "@ckb-lumos/base";
import * as core from "./schemas";
export { core };

export function numberToUInt32(value: number): HexString;
export function UInt32ToNumber(hex: HexString): number;

export interface RunResult {
    read_values: Map<Hash, Hash>;
    write_values: Map<Hash, Hash>;
    return_data: HexString;
    account_count?: HexNumber;
    new_scripts: Map<Hash, HexString>;
    write_data: Map<Hash, HexString>;
    read_data: Map<Hash, HexNumber>;
}
export interface RawL2Transaction {
    from_id: HexNumber;
    to_id: HexNumber;
    nonce: HexNumber;
    args: HexString;
}
export interface L2Transaction {
    raw: RawL2Transaction;
    signature: HexString;
}

export interface CreateAccount {
    script: Script;
}

export interface RawWithdrawalRequest {
    nonce: Uint32,
    // CKB amount
    capacity: Uint64,
    // SUDT amount
    amount: Uint128,
    sudt_script_hash: Hash,
    // layer2 account_script_hash
    account_script_hash: Hash,
    // buyer can pay sell_amount and sell_capacity to unlock
    sell_amount: Uint128,
    sell_capacity: Uint64,
    // layer1 lock to withdraw after challenge period
    owner_lock_hash: Hash,
    // layer1 lock to receive the payment, must exists on the chain
    payment_lock_hash: Hash,
}
export interface WithdrawalRequest {
    raw: RawWithdrawalRequest,
    signature: HexString,
}

// export interface HeaderInfo {
//     number: Uint64;
//     block_hash: Hash;
// }
// FIXME: todo
// export interface L2Block {}
export enum Status {
    Running = "running",
    Halting = "halting",
}

export declare class Godwoken {
    constructor(url: string);

    execute(l2tx: L2Transaction): Promise<RunResult>;
    submitL2Transaction(l2tx: L2Transaction): Promise<RunResult>;
    submitWithdrawalRequest(request: WithdrawalRequest): void;
    getBalance(sudt_id: Uint32, account_id: Uint32): Promise<Uint128>;
    getStorageAt(account_id: Uint32, key: Hash): Promise<Hash>;
    getAccountIdByScriptHash(script_hash: Hash): Promise<Uint32>;
    getNonce(account_id: Uint32): Promise<Uint32>;
    getScript(script_hash: Hash): Promise<Script>;
    getScriptHash(account_id: Uint32): Promise<Hash>;
    getData(data_hash: Hash): Promise<HexString>;
    // gw_getDataHash
    hasDataHash(data_hash: Hash): Promise<boolean>;

    // utils
    generateTransactionMessageToSign(raw_l2tx: RawL2Transaction): Hash;
    generateWithdrawalMessageToSign(raw_request: RawWithdrawalRequest): Hash;
    createAccountRawL2Transaction(
        from_id: Uint32,
        nonce: Uint32,
        script: Script,
    ): RawL2Transaction;
}
