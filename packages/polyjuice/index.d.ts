
import { Hash, HexString, Uint32, Uint64, Uint128, Godwoken } from "../godwoken";

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

    ethCall(
        from_id: Uint32,
        to_id: Uint32,
        value: Uint128,
        data: HexString,
        nonce: Uint32,
        signature: HexString,
    ): HexString;
    sendTransaction(
        from_id: Uint32,
        to_id: Uint32,
        value: Uint128,
        data: HexString,
        nonce: Uint32,
        signature: HexString,
    ): HexString;
    getBalance(account_id: Uint32): Uint128;
    getCode(account_id: Uint32);
    getTransactionCount(account_id: Uint32): Uint32;
    getStorageAt(account_id: Uint32, key: Hash): Hash;
    // Utils functions
    addressToAccountId(address: ETHAddress): Uint32;
    accountIdToAddress(id: Uint32): ETHAddress;
    // High level functions
    createCreatorAccount(privkey: HexString): Uint32;
}
