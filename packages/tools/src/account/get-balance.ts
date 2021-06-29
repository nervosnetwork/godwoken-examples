import { Godwoken } from "@godwoken-examples/godwoken";
import { Command } from "commander";

export async function getBalance(program: Command) {
  const accountId = +program.accountId;
  const sudtId = +program.sudtId;

  const godwoken = new Godwoken(
    program.parent.godwokenRpc
  );

  const balance = await godwoken.getBalance(sudtId, accountId);

  console.log(`Your balance: ${balance}`);
  console.log("Easy to read:", balance.toLocaleString());
}
