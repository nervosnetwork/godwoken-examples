import { Command } from "commander";

import { run as depositRun } from "./account/deposit-ckb";
import { run as depositSudtRun } from "./account/deposit-sudt";
import { run as transferRun } from "./account/transfer";
import { run as withdrawRun } from "./account/withdraw";

const program = new Command();
program.version("0.0.1");

program
  .command("deposit")
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
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption("-m --amount <amount>", "sudt amount")
  .requiredOption("-s --sudt-script-args <l1 sudt script args>", "sudt amount")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option(
    "-g, --godwoken-rpc <rpc>",
    "godwoken rpc path",
    "http://127.0.0.1:8119"
  )
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .option(
    "-l, --eth-address <args>",
    "Eth address (layer2 lock args, using --private-key value to calculate if not provided)"
  )
  .option("-c, --capacity <capacity>", "capacity in shannons", "40000000000")
  .action(depositSudtRun);

program
  .command("transfer")
  .requiredOption("-p, --private-key <privateKey>", "private key to use")
  .requiredOption(
    "-m, --amount <amount>",
    "capacity in shannons OR amount in sudt"
  )
  .requiredOption("-e, --fee <fee>", "fee")
  .requiredOption("-f, --from-id <from id>", "from id")
  .requiredOption("-t, --to-id <to id>", "to id")
  .requiredOption("-s, --sudt-id <sudt id>", "sudt id")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option(
    "-g, --godwoken-rpc <godwoken rpc>",
    "godwoken rpc path",
    "http://127.0.0.1:8119"
  )
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .action(transferRun);

program
  .command("withdraw")
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
  .requiredOption("-f --from-id <from id>", "from id")
  .option("-m --amount <amount>", "amount of sudt", "0")
  .option("-r, --rpc <rpc>", "ckb rpc path", "http://127.0.0.1:8114")
  .option(
    "-g, --godwoken-rpc <godwoken rpc>",
    "godwoken rpc path",
    "http://127.0.0.1:8119"
  )
  .option("-d, --indexer-path <path>", "indexer path", "./indexer-data")
  .action(withdrawRun);

program.parse(process.argv);
