import { initializeConfig } from "@ckb-lumos/config-manager";
import path from "path";
import { Indexer } from "@ckb-lumos/indexer";
import { env } from "process";

export async function initConfigAndSync(
  ckbRpc: string,
  indexerPath: string
): Promise<Indexer> {
  if (!env.LUMOS_CONFIG_NAME && !env.LUMOS_CONFIG_FILE) {
    env.LUMOS_CONFIG_NAME = "AGGRON4";
    console.log("LUMOS_CONFIG_NAME:", env.LUMOS_CONFIG_NAME);
  }
  if (env.LUMOS_CONFIG_FILE) {
    env.LUMOS_CONFIG_FILE = path.resolve(env.LUMOS_CONFIG_FILE);
    console.log("LUMOS_CONFIG_FILE:", env.LUMOS_CONFIG_FILE);
  }

  initializeConfig();

  indexerPath = path.resolve(indexerPath);
  const indexer = new Indexer(ckbRpc, indexerPath);
  indexer.startForever();

  console.log("waiting for sync ...");
  await indexer.waitForSync();
  console.log("synced ...");
  return indexer;
}
