import { Uint32, Uint128, RunResult } from "@godwoken-examples/godwoken";
import { Hash, HexString } from "@ckb-lumos/base";
export declare function submitL2Transaction(sudtId: Uint32, creatorAccountId: Uint32, fromId: Uint32, toId: Uint32, value: Uint128, data: HexString): Promise<[RunResult, Hash, Uint32]>;
export declare function executeL2Transaction(sudtId: Uint32, creatorAccountId: Uint32, fromId: Uint32, toId: Uint32, value: Uint128, data: HexString): Promise<RunResult>;
export declare function deployContract(sudtId: Uint32, creatorAccountId: Uint32, fromId: Uint32, value: Uint128, data: HexString): Promise<[RunResult, Hash, Uint32]>;
export declare function getLayer2LockHash(ethAddress: string): Hash;
export declare function getBalance(sudtId: Uint32, accountId: Uint32): Promise<bigint>;
export declare function getAccountIdByEthAddress(ethAddress: string): Promise<Uint32>;
export declare function getBalanceByEthAddress(sudtId: Uint32, ethAddress: string): Promise<bigint>;
