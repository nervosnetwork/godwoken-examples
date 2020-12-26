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
import { Polyjuice } from "@godwoken-examples/polyjuice";
import * as secp256k1 from "secp256k1";

const program = new Command();
program
    .option("-r, --rpc <rpc>", "Godwoken jsonrpc url", "http://127.0.0.1:8119");

program
    .command("deploy <init_code> <privkey>")
    .description("Deploy a EVM contract")
    .action(deploy)

