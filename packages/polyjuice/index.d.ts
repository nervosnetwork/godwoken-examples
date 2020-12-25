
import { Hash, HexString, Uint32, Uint64, Uint128, Godwoken } from "../godwoken";

export type U256 = HexString;
export type ETHAddress = HexString;

export declare class Polyjuice {
    constructor(
        client: Godwoken,
        config: {
            // TODO: hard code this value
            validator_code_hash: Hash,
            sudt_id: Uint32,
        }
    );

    eth_call(
        from_account: Uint32,
        to_account: Uint32,
        gas: Uint64,
        gasPrice: U256,
        value: U256,
        data: HexString,
        nonce: Uint32,
    );
    send_transaction(
        from_account: Uint32,
        to_account: Uint32,
        gas: Uint64,
        gasPrice: U256,
        value: U256,
        data: HexString,
        nonce: Uint32,
    );
    get_balance(sudt_id: Uint32, account_id: Uint32): Uint128;
    get_code(account_id: Uint32);
    get_transaction_count(account_id: Uint32): Uint32;
    get_storage_at(account_id: Uint32, key: Hash): Hash;
    // Utils function
    address_to_account_id(address: ETHAddress): Uint32;
    account_id_to_address(id: Uint32): ETHAddress;
}
