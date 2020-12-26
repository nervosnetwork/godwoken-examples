import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { argv, exit } from "process";

import { Command } from "commander";
import {
    Godwoken,
    L2Transaction,
    RawL2Transaction,
    RawWithdrawalRequest,
    WithdrawalRequest,
    CreateAccount,
    UInt32ToNumber,
    numberToUInt32,
} from "@godwoken-examples/godwoken";
import * as secp256k1 from "secp256k1";

const program = new Command();
program
    .option("-p, --private-key <privateKey>", "private key to use")
    .option("-r, --rpc <rpc>", "Godwoken jsonrpc url", "http://127.0.0.1:8119");
program
    .command("getNonce <account_id>")
    .description("Get nonce from account")
    .action(getNonce);
program
    .command("generateTransactionMessageToSign <from_id> <to_id> <nonce> <args>")
    .description("Generate the RawL2Transaction message to sign")
    .action(generateTransactionMessageToSign)
program.parse(argv);


async function getNonce(account_id: string) {
    const godwoken = new Godwoken(program.rpc);
    const nonce = await godwoken.getNonce(parseInt(account_id));
    console.log("nonce:", nonce);
}

async function generateTransactionMessageToSign(
    from_id: string,
    to_id: string,
    nonce: string,
    args: string,
) {
    const godwoken = new Godwoken(program.rpc);
    const raw_l2tx = {
        from_id: numberToUInt32(parseInt(from_id)),
        to_id: numberToUInt32(parseInt(to_id)),
        nonce: numberToUInt32(parseInt(nonce)),
        args,
    };
    const message = godwoken.generateTransactionMessageToSign(raw_l2tx);
    console.log("message:", message);
}
