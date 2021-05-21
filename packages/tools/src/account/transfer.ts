import { Command } from "commander";
import { privateKeyToAccountId, transferCLI } from "../modules/godwoken";
import { privateKeyToEthAddress } from "../modules/utils";
import { initConfigAndSync } from "./common";
import { Godwoken } from "@godwoken-examples/godwoken";

async function transfer(
  godwoken: Godwoken,
  privateKey: string,
  toId: number,
  sudtId: number,
  amount: bigint,
  fee: bigint
) {
  const fromId = await privateKeyToAccountId(godwoken, privateKey);
  if (!fromId) {
    console.error("from id not found!");
    process.exit(-1);
  }
  return await transferCLI(
    godwoken,
    privateKey,
    fromId,
    toId,
    sudtId,
    amount,
    fee
  );
}

export const run = async (program: Command) => {
  const ckbRpc = program.rpc;
  const indexerPath = program.indexerPath;
  const _indexer = await initConfigAndSync(ckbRpc, indexerPath);

  const amount = program.amount;
  const fee = program.fee;
  const toId = program.toId;
  const sudtId = program.sudtId;
  const godwokenURL = program.parent.godwokenRpc;

  const godwoken = new Godwoken(
    godwokenURL,
    program.parent.prefixWithGw !== false
  );

  const privateKey = program.privateKey;

  console.log("eth address:", privateKeyToEthAddress(privateKey));

  try {
    await transfer(
      godwoken,
      privateKey,
      +toId,
      +sudtId,
      BigInt(amount),
      BigInt(fee)
    );

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
