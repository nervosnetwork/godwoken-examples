import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { argv, exit } from "process";

import { normalizers, Reader } from "ckb-js-toolkit";
import { Command } from "commander";
import { core as base_core, Script, utils } from "@ckb-lumos/base";
import { scriptToAddress } from "@ckb-lumos/helpers";
import { getConfig, initializeConfig } from "@ckb-lumos/config-manager";
import { _signMessage, _generateTransactionMessageToSign } from "./common";

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
    u32ToHex,
} from "@godwoken-examples/godwoken";
import { Polyjuice } from "@godwoken-examples/polyjuice";
import * as secp256k1 from "secp256k1";
const keccak256 = require('keccak256');

const program = new Command();
program
    .option("-r, --rpc <rpc>", "Godwoken jsonrpc url", "http://127.0.0.1:8119");

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

function ckbAddress(privateKey: any) {
    initializeConfig();
    const privateKeyBuffer = new Reader(privateKey).toArrayBuffer();
    const publicKeyArray = secp256k1.publicKeyCreate(
        new Uint8Array(privateKeyBuffer)
    );
    const publicKeyHash = utils
        .ckbHash(publicKeyArray.buffer)
        .serializeJson()
        .substr(0, 42);
    const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
    const script = {
        code_hash: scriptConfig.CODE_HASH,
        hash_type: scriptConfig.HASH_TYPE,
        args: publicKeyHash,
    };
    return scriptToAddress(script);
}

function ethAddress(privkey: any) {
    const privateKeyBuffer = new Reader(privkey).toArrayBuffer();
    const publicKeyArray = secp256k1.publicKeyCreate(
        new Uint8Array(privateKeyBuffer)
    );
    const addr = `0x${keccak256(toBuffer(publicKeyArray.buffer)).slice(12).toString("hex")}`;
    console.log("EthAddress:", addr);
    return addr;
}
function accountScriptHash(privkey: any) {
    const script: Script = {
        code_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        hash_type: "data",
        args: ethAddress(privkey),
    };
    return utils.ckbHash(base_core.SerializeScript(normalizers.NormalizeScript(script))).serializeJson();
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
    const new_account_id = UInt32LEToNumber(run_result.return_data);
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
    _call(godwoken.submitL2Transaction, to_id_str, input_data, rollup_type_hash, privkey);
}

async function staticCall(
    to_id_str: string,
    input_data: string,
    rollup_type_hash: string,
    privkey: string,
) {
    const godwoken = new Godwoken(program.rpc);
    _call(godwoken.executeL2Transaction, to_id_str, input_data, rollup_type_hash, privkey);
}

