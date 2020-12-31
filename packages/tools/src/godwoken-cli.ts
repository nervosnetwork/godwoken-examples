import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { argv, exit } from "process";
import path from "path";

import { Indexer, CellCollector } from "@ckb-lumos/indexer";
import { normalizers, Reader, RPC } from "ckb-js-toolkit";
import { Command } from "commander";
import { key } from "@ckb-lumos/hd";
import { common } from "@ckb-lumos/common-scripts";
import { core as base_core, Hash, Input, CellDep, HexString, WitnessArgs, Cell, Script, utils } from "@ckb-lumos/base";
import {
  TransactionSkeleton,
  scriptToAddress,
  sealTransaction,
} from "@ckb-lumos/helpers";
import { getConfig, initializeConfig } from "@ckb-lumos/config-manager";
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
  WithdrawalLockArgs,
  UnlockWithdrawalViaFinalize,
  core,
  toBuffer,
  normalizer,
} from "@godwoken-examples/godwoken";
import * as secp256k1 from "secp256k1";
import {
  _createAccountRawL2Transaction,
  _generateTransactionMessageToSign,
  _signMessage,
  ckbAddress,
  ethAddress,
  accountScriptHash,
  generateLockScript,
} from "./common";

const program = new Command();
program
  .option("-r, --rpc <rpc>", "Godwoken jsonrpc url", "http://127.0.0.1:8119")
  .option("-s, --ckb-rpc <ckbRpc>", "CKB node jsonrpc url", "http://127.0.0.1:8114");

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
  .command("getScript <script_hash>")
  .description("Get script by script hash")
  .action(getScript)
program
  .command("deposite <privkey> <amount>")
  .description("Deposite some value [TODO]")
program
  .command("unlockWithdraw <privkey> <runner_config>")
  .description("Unlock one finalized withdrawal locked cell (NOTE: need lumos-config path)")
  .action(unlockWithdraw)

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
async function getScript(script_hash: string) {
  const godwoken = new Godwoken(program.rpc);
  const script = await godwoken.getScript(script_hash);
  console.log("script:", script);
}

async function unlockWithdraw(privkey: string, runner_config_path: string) {
  if (process.env.LUMOS_CONFIG_FILE) {
    process.env.LUMOS_CONFIG_FILE = path.resolve(process.env.LUMOS_CONFIG_FILE);
  }
  const indexerPath = "./indexer-data"
  console.log("LUMOS_CONFIG_FILE:", process.env.LUMOS_CONFIG_FILE);
  console.log("indexer-path:", indexerPath);
  const runnerConfig = JSON.parse(readFileSync(runner_config_path, "utf8"));
  console.log("godwokenConfig", runnerConfig.godwokenConfig);
  const rollup_type_script = runnerConfig.godwokenConfig.chain.rollup_type_script;
  const rollup_type_hash = utils.computeScriptHash(rollup_type_script);
  console.log("rollup_type_hash", rollup_type_hash);

  initializeConfig();
  console.log("getConfig()", getConfig());

  const l2_lock_script_hash = accountScriptHash(privkey);
  const lock_script = generateLockScript(privkey);
  const lock_script_hash = utils.computeScriptHash(lock_script);
  const ckb_address = scriptToAddress(lock_script);
  console.log("layer 2 lock script hash", l2_lock_script_hash);

  const indexer = new Indexer(program.ckbRpc, indexerPath);
  indexer.startForever();

  console.log("waiting for sync ...");
  await indexer.waitForSync();
  console.log("synced ...");

  // Ready to build L1 CKB transaction

  // * search cell by ckb address
  var user_cell: any = null;
  const userCollector = new CellCollector(indexer, {
    lock: lock_script,
  });
  for await (const cell of userCollector.collect()) {
    console.log("userCell", cell);
    user_cell = cell;
    break;
  }
  if (user_cell === null) {
    console.log("user cell not found");
    exit(-1);
  }

  // * search rollup cell then get last_finalized_block_number from cell data (GlobalState)
  const rollupCollector = new CellCollector(indexer, {
    type: rollup_type_script,
  });
  var rollup_cell: any = null;
  for await (const cell of rollupCollector.collect()) {
    console.log("rollup_cell", cell);
    rollup_cell = cell;
    break;
  }
  if (rollup_cell === null) {
    console.error("rollup_cell not found");
    exit(-1);
  }
  const globalState = new core.GlobalState(new Reader(rollup_cell.data));
  const last_finalized_block_number = globalState.getLastFinalizedBlockNumber().toLittleEndianBigUint64();
  // FIXME: this value is zero
  console.log("last_finalized_block_number", last_finalized_block_number);

  // * use rollup cell's out point as cell_deps
  const rollup_cell_dep: CellDep = {
    out_point: rollup_cell.out_point!,
    dep_type: "code",
  };

  // * search withdrawal locked cell by:
  //   - withdrawal lock code hash
  //   - owner secp256k1 blake2b160 lock hash
  //   - last_finalized_block_number
  //   - TODO: withdrawal_block_hash (to proof the block is on current rollup)
  const withdrawal_lock = runnerConfig.deploymentConfig.withdrawal_lock;
  const withdrawalCollector = new CellCollector(indexer, {
    lock: {
      code_hash: withdrawal_lock.code_hash,
      hash_type: withdrawal_lock.hash_type,
      args: "0x",
    },
    argsLen: "any",
  });
  const withdrawal_cells = [];
  for await (const cell of withdrawalCollector.collect()) {
    console.log("withdrawalCell", cell);
    const lock_args = cell.cell_output.lock.args;
    const current_rollup_type_hash = lock_args.slice(0, 66);
    console.log("current_rollup_type_hash", current_rollup_type_hash);
    if (current_rollup_type_hash !== rollup_type_hash) {
      console.log("rollup_type_hash not match");
      continue;
    }
    const withdrawal_lock_args_data = "0x" + lock_args.slice(66);
    const withdrawal_lock_args = new core.WithdrawalLockArgs(new Reader(withdrawal_lock_args_data));
    const owner_lock_hash = "0x" + toBuffer(withdrawal_lock_args.getOwnerLockHash().raw()).toString("hex");
    console.log("owner_lock_hash", owner_lock_hash);
    if (owner_lock_hash !== lock_script_hash) {
      console.log("owner_lock_hash not match")
      continue;
    }

    const withdrawal_block_number = withdrawal_lock_args.getWithdrawalBlockNumber().toLittleEndianBigUint64();
    console.log("withdrawal_block_number", withdrawal_block_number);

    withdrawal_cells.push(cell);
  }
  if (withdrawal_cells.length == 0) {
    console.warn("No withdrawal cell found");
    exit(-1);
  }
  const withdrawal_cell = withdrawal_cells[0];
  const output_cell: Cell = {
    cell_output: {
      capacity: withdrawal_cell.cell_output.capacity,
      lock: lock_script,
      type: withdrawal_cell.cell_output.type,
    },
    data: withdrawal_cell.data,
  };

  // * Build UnlockWithdrawal::UnlockWithdrawalViaFinalize and put into withess
  const block_proof = "0x";     // FIXME: fill this field
  const data = "0x00000000" + new Reader(
    core.SerializeUnlockWithdrawalViaFinalize(
      normalizer.NormalizeUnlockWithdrawalViaFinalize({block_proof})
    )).serializeJson().slice(2);
  const new_witness_args: WitnessArgs = {
    lock: data,
  };
  const witness = new Reader(
    base_core.SerializeWitnessArgs(
      normalizers.NormalizeWitnessArgs(new_witness_args)
    )
  ).serializeJson();

  let txSkeleton = TransactionSkeleton({ cellProvider: indexer });
  txSkeleton = txSkeleton
    .update("inputs", (inputs) => {
      return inputs.push(withdrawal_cell);
    })
    .update("inputs", (inputs) => {
      return inputs.push(user_cell);
    })
    .update("outputs", (outputs) => {
      return outputs.push(output_cell);
    })
    .update("cellDeps", (cell_deps) => {
      return cell_deps.push(rollup_cell_dep);
    })
    .update("witnesses", (witnesses) => {
      return witnesses.push(witness);
    });
  txSkeleton = await common.payFeeByFeeRate(
    txSkeleton,
    [ckb_address],
    BigInt(1000),
    undefined,
    { config: getConfig() },
  );
  txSkeleton = common.prepareSigningEntries(txSkeleton);
  const message: HexString = txSkeleton.get("signingEntries").get(1)!.message;
  const content: HexString = key.signRecoverable(message, privkey);
  const tx = sealTransaction(txSkeleton, [content]);
  const rpc = new RPC(program.ckbRpc);
  try {
    const txHash: Hash = await rpc.send_transaction(tx);
    console.log("txHash:", txHash);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
