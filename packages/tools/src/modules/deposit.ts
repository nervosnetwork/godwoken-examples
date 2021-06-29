import { Reader } from "ckb-js-toolkit";
import { DeploymentConfig } from "./deployment-config";
import { Script, HexString, Hash, PackedSince, utils } from "@ckb-lumos/base";
import { NormalizeDepositLockArgs } from "@godwoken-examples/godwoken/lib/normalizer";
import { SerializeDepositLockArgs } from "@godwoken-examples/godwoken/lib/schemas/godwoken";

const godwokenConfig = require("../../configs/godwoken-config.json");

SerializeDepositLockArgs
export interface DepositLockArgs {
  owner_lock_hash: Hash;
  layer2_lock: Script;
  cancel_timeout: PackedSince;
}

export function serializeArgs(args: DepositLockArgs): HexString {
  const rollup_type_hash: Hash = getRollupTypeHash();

  const serializedDepositLockArgs: ArrayBuffer = SerializeDepositLockArgs(
    NormalizeDepositLockArgs(args)
  );

  const depositLockArgsStr: HexString = new Reader(
    serializedDepositLockArgs
  ).serializeJson();

  return rollup_type_hash + depositLockArgsStr.slice(2);
}

export function generateDepositLock(
  config: DeploymentConfig,
  args: HexString
): Script {
  return {
    code_hash: config.deposit_lock.code_hash,
    hash_type: config.deposit_lock.hash_type,
    args: args,
  };
}

export function getDepositLockArgs(
  ownerLockHash: Hash,
  layer2_lock: Script,
  cancelTimeout: PackedSince = "0xc00000000002a300"
): DepositLockArgs {
  const depositLockArgs: DepositLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: layer2_lock,
    cancel_timeout: cancelTimeout, // relative timestamp, 2 days
  };
  return depositLockArgs;
}

export function getRollupTypeHash(): HexString {
  const rollupTypeScript: Script = godwokenConfig.chain
    .rollup_type_script as Script;
  const hash: HexString = utils.computeScriptHash(rollupTypeScript);

  console.log("rollupTypeHash:", hash);

  return hash;
}
