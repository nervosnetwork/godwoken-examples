
import { Map } from "immutable";

/**
 * HexString represents string starts with "0x" and followed by even number(including empty) of [0-9a-fA-F] characters.
 */
export type HexString = string;

export type Uint32 = number;
export type Uint64 = number;
export type Uint128 = number;
export type Hash = HexString;

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

export interface HeaderInfo {
    number: Uint64;
    block_hash: Hash;
}
// FIXME: todo
export interface L2Block {}
export enum Status {
    Running = "running",
    Halting = "halting",
}

export declare class Godwoken {
    constructor(url: string);

    sync(param: SyncParam): SyncEvent;
    execute(l2tx: L2Transaction): RunResult;
    submitL2Transaction(l2tx: L2Transaction): RunResult;
    lastSynced(): HeaderInfo;
    getStorageAt(raw_key: Hash): Hash;
    tip(): L2Block;
    status(): Status;
}

