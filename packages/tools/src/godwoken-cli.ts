import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { argv, exit } from "process";

import { Reader } from "ckb-js-toolkit";
import { Command } from "commander";
import { Script } from "@ckb-lumos/base";
import {
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
import * as secp256k1 from "secp256k1";
import { _createAccountRawL2Transaction, _generateTransactionMessageToSign, _signMessage } from "./common";

const program = new Command();
program
    .option("-r, --rpc <rpc>", "Godwoken jsonrpc url", "http://127.0.0.1:8119");

program
    .command("getNonce <account_id>")
    .description("Get nonce from account")
    .action(getNonce);
program
    .command("getBalance <sudt_id> <account_id>")
    .description("Get balance from account")
    .action(getBalance);
program
    .command("generateTransactionMessageToSign <from_id> <to_id> <nonce> <args> <rollup_type_hash>")
    .description("Generate the raw layer 2 transaction message to sign")
    .action(generateTransactionMessageToSign)
program
    .command("createAccountRawL2Transaction <from_id> <nonce> <script_code_hash> <script_args>")
    .description("Create raw layer 2 transaction for layer 2 creator account (to_id)")
    .action(createAccountRawL2Transaction)
program
    .command("createAccount <from_id> <nonce> <script_code_hash> <script_args> <rollup_type_hash> <privkey>")
    .description("Create an account by target script")
    .action(createAccount)
program
    .command("executeL2Transaction <from_id> <to_id> <nonce> <args> <signature>")
    .description("Submit the layer 2 transaction")
    .action(executeL2Transaction)
program
    .command("submitL2Transaction <from_id> <to_id> <nonce> <args> <signature>")
    .description("Submit the layer 2 transaction")
    .action(submitL2Transaction)
program
    .command("signMessage <message> <privkey>")
    .description("Sign the message use secp256k1")
    .action(signMessage)
program
    .command("getAccountIdByScriptHash <script_hash>")
    .description("Get account id by script hash")
    .action(getAccountIdByScriptHash)
program
    .command("getScriptHash <account_id>")
    .description("Get script hash by account id")
    .action(getScriptHash)
program
    .command("deposite <privkey> <amount>")
    .description("Deposite some value")

program.parse(argv);


async function getNonce(account_id: string) {
    const godwoken = new Godwoken(program.rpc);
    const nonce = await godwoken.getNonce(parseInt(account_id));
    console.log("nonce:", nonce);
}
async function getBalance(sudt_id: string, account_id: string) {
    const godwoken = new Godwoken(program.rpc);
    const balance = await godwoken.getBalance(parseInt(sudt_id), parseInt(account_id));
    console.log("balance:", balance);
}

function generateTransactionMessageToSign(
    from_id: string,
    to_id: string,
    nonce: string,
    args: string,
    rollup_type_hash: string,
) {
    const raw_l2tx: RawL2Transaction = {
        from_id: u32ToHex(parseInt(from_id)),
        to_id: u32ToHex(parseInt(to_id)),
        nonce: u32ToHex(parseInt(nonce)),
        args,
    };
    const message = _generateTransactionMessageToSign(raw_l2tx, rollup_type_hash);
    console.log("message:", message);
}

function createAccountRawL2Transaction(
    from_id_str: string,
    nonce_str: string,
    script_code_hash: string,
    script_args: string,
) {
    const from_id = parseInt(from_id_str);
    const nonce = parseInt(nonce_str);
    const raw_l2tx = _createAccountRawL2Transaction(
        from_id, nonce, script_code_hash, script_args,
    );
    console.log("RawL2Transaction", raw_l2tx);
}
async function createAccount(
    from_id_str: string,
    nonce_str: string,
    script_code_hash: string,
    script_args: string,
    rollup_type_hash: string,
    privkey: string,
) {
    const from_id = parseInt(from_id_str);
    const nonce = parseInt(nonce_str);
    const raw_l2tx = _createAccountRawL2Transaction(
        from_id, nonce, script_code_hash, script_args,
    );
    const message = _generateTransactionMessageToSign(raw_l2tx, rollup_type_hash);
    const signature = _signMessage(message, privkey);
    console.log("message", message);
    console.log("signature", signature);
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };

    const godwoken = new Godwoken(program.rpc);
    const run_result = await godwoken.submitL2Transaction(l2tx);
    console.log("RunResult", run_result);
    const new_account_id = UInt32LEToNumber(run_result.return_data);
    console.log("Created account id:", new_account_id);
}
async function send(
    method: Function,
    from_id: string,
    to_id: string,
    nonce: string,
    args: string,
    signature: string,
) {
    const raw_l2tx: RawL2Transaction = {
        from_id: u32ToHex(parseInt(from_id)),
        to_id: u32ToHex(parseInt(to_id)),
        nonce: u32ToHex(parseInt(nonce)),
        args,
    };
    const l2tx: L2Transaction = { raw: raw_l2tx, signature };
    let run_result = await method(l2tx);
    console.log("L2Transaction", l2tx);
    console.log("RunResult", run_result);
}
async function executeL2Transaction(
    from_id: string,
    to_id: string,
    nonce: string,
    args: string,
    signature: string,
) {
    const godwoken = new Godwoken(program.rpc);
    send(godwoken.executeL2Transaction, from_id, to_id, nonce, args, signature);
}
async function submitL2Transaction(
    from_id: string,
    to_id: string,
    nonce: string,
    args: string,
    signature: string,
) {
    const godwoken = new Godwoken(program.rpc);
    send(godwoken.submitL2Transaction, from_id, to_id, nonce, args, signature);
}

function signMessage(message: string, privkey: string) {
    const signature = _signMessage(message, privkey);
    console.log("signature:", signature);
}

async function getAccountIdByScriptHash(script_hash: string) {
    const godwoken = new Godwoken(program.rpc);
    const account_id = await godwoken.getAccountIdByScriptHash(script_hash);
    console.log("Account id:", account_id);
}

async function getScriptHash(account_id: string) {
    const godwoken = new Godwoken(program.rpc);
    const script_hash = await godwoken.getScriptHash(parseInt(account_id));
    console.log("script hash:", script_hash);
}
