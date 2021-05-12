import { Command } from "commander";

import { run as depositRun } from "./account/deposit-ckb";
import { run as depositSudtRun } from "./account/deposit-sudt";
import { run as transferRun } from "./account/transfer";
import { run as withdrawRun } from "./account/withdraw";

const program = new Command();
program.version("0.0.1");

let defaultGodwokenRpc = "http://127.0.0.1:8119";
let defaultPrefixWithGw = false;
if (!process.env.LUMOS_CONFIG_FILE) {
  defaultGodwokenRpc = "http://godwoken-testnet-web3-rpc.ckbapp.dev";
  defaultPrefixWithGw = true;
}

program
  .option(
    "-g, --godwoken-rpc <rpc>",
    "godwoken rpc path, defualt to http://127.0.0.1:8119, and LUMOS_CONFIG_FILE not provided, default to http://godwoken-testnet-web3-rpc.ckbapp.dev",
    defaultGodwokenRpc
  )
  .option(
    "-w, --prefix-with-gw",
    "prefix with `gw_` or not, , defualt to false, and LUMOS_CONFIG_FILE not provided, default to true",
    defaultPrefixWithGw
  );

program
  .command("deposit")
  .description("deposit CKB to godwoken")
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-c --capacity <capacity>", "capacity in shannons")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .option(
    "-l, --eth-address <args>",
    "Eth address (layer2 lock args, using --private-key value to calculate if not provided)"
  )
  .action(depositRun);

program
  .command("deposit-sudt")
  .description("deposit sUDT to godwoken")
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-m --amount <amount>", "sudt amount")
  .requiredOption("-s --sudt-script-args <l1 sudt script args>", "sudt amount")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .option(
    "-l, --eth-address <args>",
    "Eth address (layer2 lock args, using --private-key value to calculate if not provided)"
  )
  .option("-c, --capacity <capacity>", "capacity in shannons", "40000000000")
  .action(depositSudtRun);

program
  .command("transfer")
  .description("transfer godwoken sudt to another account")
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption(
    "-m, --amount <amount>",
    "capacity in shannons OR amount in sudt"
  )
  .requiredOption("-e, --fee <fee>", "fee")
  .requiredOption("-t, --to-id <to id>", "to id")
  .requiredOption("-s, --sudt-id <sudt id>", "sudt id")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .action(transferRun);

program
  .command("withdraw")
  .description("withdraw CKB / sUDT from godwoken")
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-c, --capacity <capacity>", "capacity in shannons")
  .requiredOption(
    "-s --sudt-script-hash <sudt script hash>",
    "l1 sudt script hash"
  )
  .requiredOption(
    "-o --owner-ckb-address <owner ckb address>",
    "owner ckb address (to)"
  )
  .option("-m --amount <amount>", "amount of sudt", "0")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .action(withdrawRun);

program.parse(process.argv);
