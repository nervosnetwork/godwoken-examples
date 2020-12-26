import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { argv, exit } from "process";

import { Command } from "commander";
import { Godwoken } from "@godwoken-examples/godwoken";
import * as secp256k1 from "secp256k1";

const program = new Command();
program
    .option("-p, --private-key <privateKey>", "private key to use")
    .option("-r, --rpc <rpc>", "Godwoken jsonrpc url", "http://127.0.0.1:8119");
program
    .command("getNonce <account_id>")
    .description("Get nonce from account")
    .action(async (account_id) => {
        const godwoken = new Godwoken(program.rpc);
        const nonce = await godwoken.getNonce(account_id);
        console.log(`nonce: ${nonce}`);
    });
program.parse(argv);
