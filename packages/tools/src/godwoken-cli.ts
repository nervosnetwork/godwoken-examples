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
    .command("generateTransactionMessageToSign <from_id> <to_id> <nonce> <args>")
    .description("Generate the raw layer 2 transaction message to sign")
    .action(generateTransactionMessageToSign)
program
    .command("createAccountRawL2Transaction <from_id> <nonce> <script_code_hash> <script_args>")
    .description("Create raw layer 2 transaction for layer 2 creator account (to_id)")
    .action(createAccountRawL2Transaction)
program
    .command("createAccount <from_id> <nonce> <script_code_hash> <script_args> <privkey>")
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
    .command("deposite <privkey> <amount>")
    .description("")

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

function _generateTransactionMessageToSign(
    from_id: number,
    to_id: number,
    nonce: number,
    args: string,
) {
    const raw_l2tx = {
        from_id: u32ToHex(from_id),
        to_id: u32ToHex(to_id),
        nonce: u32ToHex(nonce),
        args,
    };
    console.log("RawL2Transaction", raw_l2tx);
    return GodwokenUtils.generateTransactionMessageToSign(raw_l2tx);
}
function generateTransactionMessageToSign(
    from_id: string,
    to_id: string,
    nonce: string,
    args: string,
) {
    const message = _generateTransactionMessageToSign(
        parseInt(from_id),
        parseInt(to_id),
        parseInt(nonce),
        args,
    );
    console.log("message:", message);
}

function _createAccountRawL2Transaction(
    from_id: number,
    nonce: number,
    script_code_hash: string,
    script_args: string,
) {
    const script: Script = {
        code_hash: script_code_hash,
        hash_type: "data",
        args: script_args
    };
    return GodwokenUtils.createAccountRawL2Transaction(from_id, nonce, script);
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
    privkey: string,
) {
    const from_id = parseInt(from_id_str);
    const nonce = parseInt(nonce_str);
    const raw_l2tx = _createAccountRawL2Transaction(
        from_id, nonce, script_code_hash, script_args,
    );
    const message = _generateTransactionMessageToSign(from_id, 0, nonce, raw_l2tx.args);
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

function _signMessage(message: string, privkey: string) {
    const signObject = secp256k1.ecdsaSign(
        new Uint8Array(new Reader(message).toArrayBuffer()),
        new Uint8Array(new Reader(privkey).toArrayBuffer())
    );
    const signatureBuffer = new ArrayBuffer(65);
    const signatureArray = new Uint8Array(signatureBuffer);
    signatureArray.set(signObject.signature, 0);
    signatureArray.set([signObject.recid], 64);
    return new Reader(signatureBuffer).serializeJson();
}
function signMessage(message: string, privkey: string) {
    const signature = _signMessage(message, privkey);
    console.log("signature:", signature);
}
