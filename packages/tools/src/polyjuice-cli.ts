import { argv, exit } from "process";

import { Command } from "commander";
import { Script, utils } from "@ckb-lumos/base";
import {
  _signMessage,
  _generateTransactionMessageToSign,
  _createAccountRawL2Transaction,
  accountScriptHash,
} from "./common";

import {
  Godwoken,
  L2Transaction,
  numberToUInt32LE,
} from "@godwoken-examples/godwoken";
import { Polyjuice } from "@godwoken-examples/polyjuice";
import {
  ROLLUP_TYPE_HASH,
  VALIDATOR_SCRIPT_TYPE_HASH,
} from "./modules/godwoken-config";
import { asyncSleep } from "./modules/utils";
import { privateKeyToAccountId } from "./modules/godwoken";

const program = new Command();
program.option(
  "-r, --rpc <rpc>",
  "Godwoken jsonrpc url",
  "http://127.0.0.1:8119"
);

let defaultGodwokenRpc = "http://127.0.0.1:8119";
let defaultPrefixWithGw = false;
if (process.env.ENABLE_TESTNET_MODE) {
  defaultGodwokenRpc = "http://godwoken-testnet-web3-rpc.ckbapp.dev";
  defaultPrefixWithGw = true;
}

program
  .option(
    "-g, --godwoken-rpc <rpc>",
    "godwoken rpc path, defualt to http://127.0.0.1:8119, and ENABLE_TESTNET_MODE=true, default to http://godwoken-testnet-web3-rpc.ckbapp.dev",
    defaultGodwokenRpc
  )
  .option(
    "-w, --prefix-with-gw",
    "prefix with `gw_` or not, , defualt to false, and ENABLE_TESTNET_MODE=true, default to true",
    defaultPrefixWithGw
  );

program
  .command("create-creator-account")
  .description(
    "Create account id for create polyjuice contract account (the `creator_account_id` config)"
  )
  .requiredOption(
    "-p, --private-key <private key>",
    "your private key to create creator account id"
  )
  .option("-s, --sudt-id <sudt id>", "sudt id, default to CKB id (1)", "1")
  .action(createCreatorAccount);
program
  .command(
    "deploy <creator_account_id>  <gas_limit> <gas_price> <init_code> <rollup_type_hash> <privkey>"
  )
  .description("Deploy a EVM contract")
  .action(deploy);
program
  .command(
    "call <to_id> <gas_limit> <gas_price> <input_data> <rollup_type_hash> <privkey>"
  )
  .description("Call a EVM contract")
  .action(call);
program
  .command(
    "staticCall <gas_limit> <gas_price> <to_id> <input_data> <rollup_type_hash> <privkey>"
  )
  .description("Static Call a EVM contract")
  .action(staticCall);
program.parse(argv);

function getValidatorScriptHash(): string {
  const script_hash = VALIDATOR_SCRIPT_TYPE_HASH;
  if (script_hash === undefined || !script_hash || script_hash.length != 66) {
    throw new Error(
      `invalid polyjuice validator script hash: '${script_hash}', check your 'godwoken-config.json'.`
    );
  }
  return script_hash;
}

function getRollupTypeHash(): string {
  const script_hash = ROLLUP_TYPE_HASH;
  if (script_hash === undefined || !script_hash || script_hash.length != 66) {
    throw new Error(
      `invalid godwoken rollup type hash: '${script_hash}', check your 'godwoken-config.json'.`
    );
  }
  return script_hash;
}

async function createCreatorAccount(program: Command) {
  const godwokenUrl = program.parent.godwokenRpc;
  // const fromId = +program.fromId;
  const sudtId = +program.sudtId;
  const privateKey = program.privateKey;

  const godwoken = new Godwoken(godwokenUrl);

  const fromId = +(await privateKeyToAccountId(godwoken, privateKey));
  if (!fromId) {
    console.error("Account id of provided private key not found!");
    exit(-1);
  }
  console.log("Your from id:", fromId);

  const nonce = await godwoken.getNonce(fromId);
  const script_args = numberToUInt32LE(sudtId);
  let validator_script_hash = getValidatorScriptHash();

  const raw_l2tx = _createAccountRawL2Transaction(
    fromId,
    nonce,
    validator_script_hash,
    getRollupTypeHash() + script_args.slice(2)
  );

  const sender_script_hash = await godwoken.getScriptHash(fromId);
  const receiver_script_hash = await godwoken.getScriptHash(0);

  const message = _generateTransactionMessageToSign(
    raw_l2tx,
    getRollupTypeHash(),
    sender_script_hash,
    receiver_script_hash
  );
  const signature = _signMessage(message, privateKey);
  console.log("message:", message);
  console.log("signature:", signature);
  const l2tx: L2Transaction = { raw: raw_l2tx, signature };
  console.log("l2 tx:", JSON.stringify(l2tx, null, 2));
  const run_result = await godwoken.submitL2Transaction(l2tx);
  console.log("run result:", run_result);
  // const new_account_id = UInt32LEToNumber(run_result.return_data);
  // console.log("Created account id:", new_account_id);

  const l2_script: Script = {
    code_hash: validator_script_hash,
    hash_type: "type",
    args: getRollupTypeHash() + script_args.slice(2),
  };
  const l2_script_hash = utils.computeScriptHash(l2_script);
  console.log("creator account l2 script hash:", l2_script_hash);

  // wait for tx committed
  const loopInterval = 3;
  for (let i = 0; i < 300; i += loopInterval) {
    console.log(`waiting for account id created ... waiting for ${i} seconds`);
    const accountId = await godwoken.getAccountIdByScriptHash(l2_script_hash);
    if (!!accountId) {
      console.log("Your creator account id:", accountId);
      break;
    }

    await asyncSleep(loopInterval * 1000);
  }
}

async function deploy(
  creator_account_id_str: string,
  gas_limit_str: string,
  gas_price_str: string,
  init_code: string,
  rollup_type_hash: string,
  privkey: string
) {
  const creator_account_id = parseInt(creator_account_id_str);
  const gas_limit = BigInt(gas_limit_str);
  const gas_price = BigInt(gas_price_str);
  const godwoken = new Godwoken(program.rpc);
  let validator_script_hash = getValidatorScriptHash();
  const polyjuice = new Polyjuice(godwoken, {
    validator_script_hash: validator_script_hash,
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
  const raw_l2tx = polyjuice.generateTransaction(
    from_id,
    0,
    gas_limit,
    gas_price,
    0n,
    init_code,
    nonce
  );

  const sender_script_hash = await godwoken.getScriptHash(from_id);
  const receiver_script_hash = await godwoken.getScriptHash(creator_account_id);

  const message = _generateTransactionMessageToSign(
    raw_l2tx,
    rollup_type_hash,
    sender_script_hash,
    receiver_script_hash
  );
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
  gas_limit_str: string,
  gas_price_str: string,
  input_data: string,
  rollup_type_hash: string,
  privkey: string
) {
  const godwoken = new Godwoken(program.rpc);
  let validator_script_hash = getValidatorScriptHash();
  const polyjuice = new Polyjuice(godwoken, {
    validator_script_hash: validator_script_hash,
    sudt_id: 1,
    creator_account_id: 0,
  });
  const script_hash = accountScriptHash(privkey);
  const from_id = await godwoken.getAccountIdByScriptHash(script_hash);
  if (!from_id) {
    console.log("Can not find account id by script_hash:", script_hash);
    exit(-1);
  }
  const gas_limit = BigInt(gas_limit_str);
  const gas_price = BigInt(gas_price_str);
  const nonce = await godwoken.getNonce(from_id);
  const raw_l2tx = polyjuice.generateTransaction(
    from_id,
    parseInt(to_id_str),
    gas_limit,
    gas_price,
    0n,
    input_data,
    nonce
  );

  const sender_script_hash = script_hash;
  const receiver_script_hash = await godwoken.getScriptHash(+to_id_str);

  const message = _generateTransactionMessageToSign(
    raw_l2tx,
    rollup_type_hash,
    sender_script_hash,
    receiver_script_hash
  );
  const signature = _signMessage(message, privkey);
  const l2tx: L2Transaction = { raw: raw_l2tx, signature };
  console.log("L2Transaction", l2tx);
  const run_result = await method(l2tx);
  console.log("RunResult", run_result);
  console.log("return data", run_result.return_data);
}

async function call(
  to_id_str: string,
  gas_limit_str: string,
  gas_price_str: string,
  input_data: string,
  rollup_type_hash: string,
  privkey: string
) {
  const godwoken = new Godwoken(program.rpc);
  _call(
    godwoken.submitL2Transaction.bind(godwoken),
    to_id_str,
    gas_limit_str,
    gas_price_str,
    input_data,
    rollup_type_hash,
    privkey
  );
}

async function staticCall(
  to_id_str: string,
  gas_limit_str: string,
  gas_price_str: string,
  input_data: string,
  rollup_type_hash: string,
  privkey: string
) {
  const godwoken = new Godwoken(program.rpc);
  _call(
    godwoken.executeL2Transaction.bind(godwoken),
    to_id_str,
    gas_limit_str,
    gas_price_str,
    input_data,
    rollup_type_hash,
    privkey
  );
}
