
import { Map } from "immutable";

export type Uint32 = number;
export type Uint64 = number;
export type Uint128 = number;

import { HexString, Hash, Script } from "@ckb-lumos/base";
import { * as core } from "./schemas";
export { core };


// FIXME: todo
export interface SyncParam {}
// FIXME: todo
export enum SyncEvent {}

export interface RunResult {
    read_values: Map<Hash, Hash>;
    write_values: Map<Hash, Hash>;
    return_data: HexString;
    account_count?: Uint32;
    new_scripts: Map<Hash, HexString>;
    write_data: Map<Hash, HexString>;
    read_data: Map<Hash, Uint32>;
}
export interface RawL2Transaction {
    from_id: Uint32;
    to_id: Uint32;
    nonce: Uint32;
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
    signRawL2Transaction(raw_l2tx: RawL2Transaction, privkey: HexString): HexString;
    createAccountRawL2Transaction(script: Script): RawL2Transaction;
}
