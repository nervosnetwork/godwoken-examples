
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
    getStorageAt(account_id: Uint32, key: Hash): Promise<Hash>;
    getSudtBalance(sudt_id: Uint32, account_id: Uint32): Promise<Uint128>;
    getNonce(account_id: Uint32): Promise<Uint32>;

    // utils
    generateMessageToSign(raw_l2tx: RawL2Transaction): Hash;
    createAccountRawL2Transaction(
        from_id: Uint32,
        nonce: Uint32,
        script: Script,
    ): RawL2Transaction;
}
