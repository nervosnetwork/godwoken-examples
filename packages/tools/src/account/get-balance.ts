import { Godwoken } from "@godwoken-examples/godwoken";
import { Command } from "commander";

export async function getBalance(
  accountId: number,
  sudtId = 1,
  program: Command
) {
  accountId = +accountId;
  sudtId = +sudtId;

  const godwoken = new Godwoken(
    program.parent.godwokenRpc,
    program.parent.prefixWithGw !== false
  );

  const balance = await godwoken.getBalance(sudtId, accountId);

  console.log(`Your balance: ${balance}`);
  console.log("Easy to read:", balance.toLocaleString());
}
