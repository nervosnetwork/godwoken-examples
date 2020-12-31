import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { argv, exit } from "process";

import { normalizers, Reader } from "ckb-js-toolkit";
import { Command } from "commander";
import { core as base_core, Script, utils } from "@ckb-lumos/base";
import { scriptToAddress } from "@ckb-lumos/helpers";
import { getConfig, initializeConfig } from "@ckb-lumos/config-manager";
import {
    _signMessage,
    _generateTransactionMessageToSign,
    _createAccountRawL2Transaction,
    accountScriptHash,
} from "./common";

import {
    core,
    toBuffer,
    Godwoken,
    GodwokenUtils,
    L2Transaction,
    RawL2Transaction,
    RawWithdrawalRequest,
    WithdrawalRequest,
    CreateAccount,
    UInt32LEToNumber,
    numberToUInt32LE,
    u32ToHex,
} from "@godwoken-examples/godwoken";
import { Polyjuice } from "@godwoken-examples/polyjuice";
import * as secp256k1 from "secp256k1";

const program = new Command();
program
    .option("-r, --rpc <rpc>", "Godwoken jsonrpc url", "http://127.0.0.1:8119");

program
    .command("createCreatorAccount <from_id> <sudt_id> <rollup_type_hash> <privkey>")
    .description("Create account id for create polyjuice contract account (the `creator_account_id` config)")
    .action(createCreatorAccount)
program
    .command("deploy <creator_account_id> <init_code> <rollup_type_hash> <privkey>")
    .description("Deploy a EVM contract")
    .action(deploy)
program
    .command("call <to_id> <input_data> <rollup_type_hash> <privkey>")
    .description("Call a EVM contract")
    .action(call)
program
    .command("staticCall <to_id> <input_data> <rollup_type_hash> <privkey>")
    .description("Static Call a EVM contract")
    .action(staticCall)
program.parse(argv);

const validator_code_hash = "0x20814f4f3ebaf8a297d452aa38dbf0f9cb0b2988a87cb6119c2497de817e7de9";

async function createCreatorAccount(
    from_id_str: string,
    sudt_id_str: string,
    rollup_type_hash: string,
    privkey: string
) {
    const godwoken = new Godwoken(program.rpc);
    const from_id = parseInt(from_id_str);
    const nonce = await godwoken.getNonce(from_id);
    const script_args = numberToUInt32LE(parseInt(sudt_id_str));
    const raw_l2tx = _createAccountRawL2Transaction(
        from_id, nonce, validator_code_hash, script_args,
    );
    const message = _generateTransactionMessageToSign(raw_l2tx, rollup_type_hash);
    const signature = _signMessage(message, privkey);
    console.log("message", message);
    console.log("signature", signature);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    const run_result = await godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    const new_account_id = UInt32LEToNumber(run_result.return_data);
    console.log("Created account id:", new_account_id);
}

async function deploy(
    creator_account_id_str: string,
    init_code: string,
    rollup_type_hash: string,
    privkey: string,
) {
    const creator_account_id = parseInt(creator_account_id_str);
    const godwoken = new Godwoken(program.rpc);
    const polyjuice = new Polyjuice(godwoken, {
        validator_code_hash: "0x20814f4f3ebaf8a297d452aa38dbf0f9cb0b2988a87cb6119c2497de817e7de9",
        sudt_id: 1,
        creator_account_id,
    });
    const script_hash = accountScriptHash(privkey);
    const from_id = await godwoken.getAccountIdByScriptHash(script_hash);
    if (!from_id) {
        console.log("Can not find account id by script_hash:", script_hash);
        exit(-1);
    }
    const nonce = await godwoken.getNonce(from_id);
    const raw_l2tx = polyjuice.generateTransaction(from_id, 0, 0n, init_code, nonce);
    const message = _generateTransactionMessageToSign(raw_l2tx, rollup_type_hash);
    const signature = _signMessage(message, privkey);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    console.log("L2Transaction", l2tx);
    const run_result = await godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    const new_script_hash = polyjuice.calculateScriptHash(from_id, nonce);
    console.log("new script hash", new_script_hash);
    const new_account_id = await godwoken.getAccountIdByScriptHash(
        new_script_hash
    );
    console.log("new account id:", new_account_id);
}

async function _call(
    method: Function,
    to_id_str: string,
    input_data: string,
    rollup_type_hash: string,
    privkey: string,
) {
    const godwoken = new Godwoken(program.rpc);
    const polyjuice = new Polyjuice(godwoken, {
        validator_code_hash: "0x20814f4f3ebaf8a297d452aa38dbf0f9cb0b2988a87cb6119c2497de817e7de9",
        sudt_id: 1,
        creator_account_id: 0,
    });
    const script_hash = accountScriptHash(privkey);
    const from_id = await godwoken.getAccountIdByScriptHash(script_hash);
    if (!from_id) {
        console.log("Can not find account id by script_hash:", script_hash);
        exit(-1);
    }
    const nonce = await godwoken.getNonce(from_id);
    const raw_l2tx = polyjuice.generateTransaction(from_id, parseInt(to_id_str), 0n, input_data, nonce);
    const message = _generateTransactionMessageToSign(raw_l2tx, rollup_type_hash);
    const signature = _signMessage(message, privkey);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    console.log("L2Transaction", l2tx);
    const run_result = await method(l2tx);
    console.log("RunResult", run_result);
    console.log("return data", run_result.return_data);
}

async function call(
    to_id_str: string,
    input_data: string,
    rollup_type_hash: string,
    privkey: string,
) {
    const godwoken = new Godwoken(program.rpc);
    _call(
        godwoken.submitL2Transaction.bind(godwoken),
        to_id_str, input_data, rollup_type_hash, privkey,
    );
}

async function staticCall(
    to_id_str: string,
    input_data: string,
    rollup_type_hash: string,
    privkey: string,
) {
    const godwoken = new Godwoken(program.rpc);
    _call(
        godwoken.executeL2Transaction.bind(godwoken),
        to_id_str, input_data, rollup_type_hash, privkey,
    );
}

