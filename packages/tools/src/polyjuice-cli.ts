import { argv, exit } from "process";

import { Command } from "commander";
import { Hash, HexString, Script, utils } from "@ckb-lumos/base";
import {
  _signMessage,
  _generateTransactionMessageToSign,
  _createAccountRawL2Transaction,
} from "./common";

import {
  Godwoken,
  L2Transaction,
  numberToUInt32LE,
} from "@godwoken-examples/godwoken";
import { ETHAddress, Polyjuice } from "@godwoken-examples/polyjuice";
import {
  ROLLUP_TYPE_HASH,
  VALIDATOR_SCRIPT_TYPE_HASH,
} from "./modules/godwoken-config";
import { asyncSleep } from "./modules/utils";
import {
  parseAccountToId,
  privateKeyToAccountId,
  privateKeyToScriptHash,
} from "./modules/godwoken";

const EMPTY_ETH_ADDRESS = "0x" + "00".repeat(20);

const program = new Command();

let defaultGodwokenRpc = "http://127.0.0.1:8119";
let defaultCreatorAccountId = undefined;
if (process.env.ENABLE_TESTNET_MODE) {
  defaultGodwokenRpc = "http://godwoken-testnet-web3-rpc.ckbapp.dev";
  defaultCreatorAccountId = "3";
}

program.option(
  "-g, --godwoken-rpc <rpc>",
  "godwoken rpc path, defualt to http://127.0.0.1:8119, default to http://godwoken-testnet-web3-rpc.ckbapp.dev if ENABLE_TESTNET_MODE=true",
  defaultGodwokenRpc
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
  .option("-f, --fee <fee>", "fee in sudt-id", "0")
  .action(createCreatorAccount);

program
  .command("deploy")
  .description("Deploy a EVM contract")
  .requiredOption(
    "-a, --creator-account-id <creator account id>",
    "creator account id, default to `3` if ENABLE_TESTNET_MODE=true",
    defaultCreatorAccountId
  )
  .requiredOption("-l, --gas-limit <gas limit>", "gas limit")
  .requiredOption("-p, --gas-price <gas price>", "gas price")
  .requiredOption("-d, --data <contract data>", "data")
  .requiredOption("-p, --private-key <private key>", "private key")
  .option("-s, --sudt-id <sudt id>", "sudt id, default to CKB id (1)", "1")
  .option("-v, --value <value>", "value", "0")
  .action(deploy);

program
  .command("send-transaction")
  .description("Send a transaction to godwoken by `eth_sendRawTransaction`")
  .requiredOption("-t, --to-address <eth address>", "to address")
  .requiredOption("-l, --gas-limit <gas limit>", "gas limit")
  .requiredOption("-p, --gas-price <gas price>", "gas price")
  .requiredOption("-d, --data <data>", "data")
  .requiredOption("-p, --private-key <private key>", "private key")
  .requiredOption(
    "-c, --creator-account-id <creator account id>",
    "creator account id, default to `3` if ENABLE_TESTNET_MODE=true",
    defaultCreatorAccountId
  )
  .option("-v, --value <value>", "value", "0")
  .action(sendTx);

program
  .command("call")
  .description("Static Call a EVM contract by `eth_call`")
  .requiredOption("-t, --from <from>", "from address OR from id")
  .option("-t, --to-address <contract address>", "contract address", "0x")
  .option(
    "-l, --gas-limit <gas limit>",
    "gas limit",
    BigInt("0x1000000").toString()
  )
  .option("-p, --gas-price <gas price>", "gas price", "1")
  .option("-d, --data <data>", "data", "0x")
  .option("-v, --value <value>", "value", "0")
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
  const feeAmount = BigInt(program.fee);

  const godwoken = new Godwoken(godwokenUrl);

  const fromId = +(await privateKeyToAccountId(godwoken, privateKey))!;
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
    getRollupTypeHash() + script_args.slice(2),
    sudtId,
    feeAmount
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

async function deploy(program: Command) {
  const creator_account_id = +program.creatorAccountId;
  const gas_limit = BigInt(program.gasLimit);
  const gas_price = BigInt(program.gasPrice);
  const data = program.data;
  const godwoken = new Godwoken(program.parent.godwokenRpc);
  const privateKey = program.privateKey;
  const sudtId = program.sudtId;
  const value = BigInt(program.value);

  await send(
    godwoken,
    "0x",
    creator_account_id,
    privateKey,
    sudtId,
    gas_limit,
    gas_price,
    data,
    value
  );
}

async function sendTx(program: Command) {
  const gas_limit = BigInt(program.gasLimit);
  const gas_price = BigInt(program.gasPrice);
  const data = program.data;
  const private_key = program.privateKey;
  const value = BigInt(program.value);
  const to_address = program.toAddress;
  const creator_account_id = +program.creatorAccountId;
  const sudt_id = +program.sudtId;

  const godwoken = new Godwoken(program.parent.godwokenRpc);

  await send(
    godwoken,
    to_address,
    creator_account_id,
    private_key,
    sudt_id,
    gas_limit,
    gas_price,
    data,
    value
  );
}

async function staticCall(program: Command) {
  const gas_limit = BigInt(program.gasLimit);
  const gas_price = BigInt(program.gasPrice);
  const data = program.data;
  const value = BigInt(program.value);
  const to_address = program.toAddress;
  const from = program.from;

  const godwoken = new Godwoken(program.parent.godwokenRpc);
  const from_id = await parseAccountToId(godwoken, from);

  if (from_id == null) {
    console.error("from account not exists!");
    exit(-1);
  }

  let validator_script_hash = getValidatorScriptHash();

  const polyjuice = new Polyjuice(godwoken, {
    validator_script_hash: validator_script_hash,
    sudt_id: 1,
    creator_account_id: 0,
  });
  const nonce = 0;

  const to_script_hash = await godwoken.getScriptHashByShortAddress(to_address);
  const to_id = await godwoken.getAccountIdByScriptHash(to_script_hash);
  if (to_id == null) {
    console.error("to id not found!");
    exit(-1);
  }

  const raw_l2tx = polyjuice.generateTransaction(
    from_id,
    to_id,
    gas_limit,
    gas_price,
    value,
    data,
    nonce
  );
  console.log("raw l2 transaction:", raw_l2tx);

  const run_result = await godwoken.executeRawL2Transaction(raw_l2tx);
  console.log("run result:", run_result);
  console.log("return data", run_result.return_data);
}

async function send(
  godwoken: Godwoken,
  to_address: ETHAddress,
  creator_account_id: number,
  private_key: HexString,
  sudt_id: number,
  gas_limit: bigint,
  gas_price: bigint,
  data: HexString,
  value: bigint
) {
  if (to_address === EMPTY_ETH_ADDRESS) {
    to_address = "0x";
  }

  const validator_script_hash = getValidatorScriptHash();

  const polyjuice = new Polyjuice(godwoken, {
    validator_script_hash: validator_script_hash,
    sudt_id: sudt_id,
    creator_account_id,
  });

  const script_hash = privateKeyToScriptHash(private_key);
  const from_id = await godwoken.getAccountIdByScriptHash(script_hash);
  if (!from_id) {
    console.log("Can not find account id by script_hash:", script_hash);
    exit(-1);
  }
  const nonce = await godwoken.getNonce(from_id);
  let to_id = creator_account_id;
  if (to_address !== "0x") {
    const scriptHash = await godwoken.getScriptHashByShortAddress(to_address);
    const id = await godwoken.getAccountIdByScriptHash(scriptHash);
    if (id == null) {
      console.error("to id not found!");
      exit(-1);
    }
    to_id = id;
  }
  const raw_l2tx = polyjuice.generateTransaction(
    from_id,
    to_id,
    gas_limit,
    gas_price,
    value,
    data,
    nonce
  );

  const sender_script_hash: Hash = await godwoken.getScriptHash(from_id);
  const receiver_script_hash: Hash = await godwoken.getScriptHash(to_id);
  const message = _generateTransactionMessageToSign(
    raw_l2tx,
    getRollupTypeHash(),
    sender_script_hash,
    receiver_script_hash
  );
  console.log("message:", message);

  const signature = _signMessage(message, private_key);
  const l2tx: L2Transaction = { raw: raw_l2tx, signature };
  console.log("L2Transaction:", l2tx);
  const l2TxHash = await godwoken.submitL2Transaction(l2tx);
  // const run_result = await godwoken.executeL2Transaction(l2tx)
  console.log("l2 tx hash:", l2TxHash);

  const eth_tx_hash = polyjuice.calcEthTxHash(
    to_address,
    gas_limit,
    gas_price,
    value,
    data,
    nonce,
    signature
  );
  console.log("eth tx hash:", eth_tx_hash);

  // wait for transaction receipt
  const loopInterval = 3;
  let receipt;
  for (let i = 0; i < 300; i += loopInterval) {
    console.log(`waiting for transaction receipt ... waiting for ${i} seconds`);
    receipt = await godwoken.getTransactionReceipt(l2TxHash);
    if (receipt) {
      console.log("transaction receipt:", receipt);
      break;
    }
    await asyncSleep(loopInterval * 1000);
  }

  // for deploy contract
  if (to_address === "0x") {
    // get polyjuice system log
    const polyjuice_system_log = receipt.logs.find(
      (log: any) => log.service_flag === "0x2"
    );
    const data: HexString = polyjuice_system_log.data;
    const dataBuffer = Buffer.from(data.slice(2), "hex");
    const addressBuffer = dataBuffer.slice(16, 36);
    const address = "0x" + addressBuffer.toString("hex");
    console.log("contract address:", address);
  }
}
