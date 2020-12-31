import { Hash } from "@ckb-lumos/base";
import { Uint32, Uint128 } from "@godwoken-examples/godwoken";
/**
 *
 * @param fromId
 * @param toId sudt id
 * @param accountId
 */
export declare function query(fromId: Uint32, toId: Uint32, accountId: Uint32): Promise<Uint128>;
export declare function transfer(fromId: Uint32, toId: Uint32, sudtId: Uint32, amount: Uint128, fee: Uint128): Promise<void>;
export declare function withdraw(fromId: Uint32, capacity: bigint, amount: bigint, sudtScriptHash: Hash, accountScriptHash: Hash, ownerLockHash: Hash): Promise<void>;
