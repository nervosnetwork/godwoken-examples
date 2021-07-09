import { HexString, Script, utils } from "@ckb-lumos/base";
import { Godwoken } from "@godwoken-examples/godwoken";
import commander from "commander";
import { deploymentConfig } from "../modules/deployment-config";
import { ROLLUP_TYPE_HASH } from "../modules/godwoken-config";

function ethEoaAddressToGodwokenShortAddress(ethAddress: HexString): HexString {
  if (ethAddress.length !== 42 || !ethAddress.startsWith("0x")) {
    throw new Error("eth address format error!");
  }

  const layer2Lock: Script = {
    code_hash: deploymentConfig.eth_account_lock.code_hash,
    hash_type: deploymentConfig.eth_account_lock.hash_type as "data" | "type",
    args: ROLLUP_TYPE_HASH + ethAddress.slice(2).toLowerCase(),
  };
  const scriptHash = utils.computeScriptHash(layer2Lock);
  const shortAddress = scriptHash.slice(0, 42);
  return shortAddress;
}

async function godwokenShortAddressToEthEoaAddress(
  godwoken: Godwoken,
  godwokenAddress: HexString
): Promise<HexString> {
  const scriptHash = await godwoken.getScriptHashByShortAddress(
    godwokenAddress
  );
  const script = await godwoken.getScript(scriptHash);
  const ethAddress = "0x" + script.args.slice(66);
  return ethAddress;
}

export const toShortAddress = async (program: commander.Command) => {
  const ethAddress = program.ethAddress;

  try {
    const shortAddress = ethEoaAddressToGodwokenShortAddress(ethAddress);
    console.log("godwoken short address:", shortAddress);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export const toEthAddress = async (program: commander.Command) => {
  const shortAddress = program.shortAddress;
  const godwokenURL = program.parent.godwokenRpc;

  const godwoken = new Godwoken(godwokenURL);

  try {
    const ethAddress = await godwokenShortAddressToEthEoaAddress(
      godwoken,
      shortAddress
    );
    console.log("eth eoa address:", ethAddress);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
