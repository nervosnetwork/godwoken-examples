import { Polyjuice } from "@godwoken-examples/polyjuice";
import {
  Godwoken,
  Uint32,
  Uint128,
  RawL2Transaction,
  GodwokenUtils,
} from "@godwoken-examples/godwoken";
import Config from "../configs/config.json";
import { HexString } from "@ckb-lumos/base";
import { sign } from "./utils/eth_sign";
import { L2Transaction } from "./base/normalizer";
const polyjuiceConfig = Config.polyjuice;

const godwokenUrl = "http://localhost:8119";

export async function sendTransaction(
  sudtId: Uint32,
  creatorAccountId: Uint32,
  fromId: Uint32,
  toId: Uint32,
  value: Uint128,
  data: HexString
) {
  const godwoken = new Godwoken(godwokenUrl);
  const polyjuice = new Polyjuice(godwoken, {
    validator_code_hash: polyjuiceConfig.validator_code_hash,
    sudt_id: sudtId,
    creator_account_id: creatorAccountId,
  });

  const nonce: Uint32 = await godwoken.getNonce(fromId);

  const rawL2Transaction: RawL2Transaction = polyjuice.generateTransaction(
    fromId,
    toId,
    value,
    data,
    nonce
  );

  const message = GodwokenUtils.generateTransactionMessageToSign(
    rawL2Transaction
  );

  const signature: HexString = await sign(message);

  const l2Transaction: L2Transaction = {
    raw: rawL2Transaction,
    signature,
  };

  const runResult = await godwoken.submitL2Transaction(l2Transaction);

  return runResult;
}
