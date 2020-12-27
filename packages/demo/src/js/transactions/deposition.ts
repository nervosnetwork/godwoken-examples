import { Reader } from "ckb-js-toolkit";
import { SerializeDepositionLockArgs } from "../../schemas/godwoken";
import { DeploymentConfig } from "../base";
import { Script, HexString, Hash, PackedSince, utils } from "@ckb-lumos/base";
import { NormalizeDepositionLockArgs } from "../base/normalizer";
import runnerConfig from "../../configs/runner_config.json";
import Config from "../../configs/config.json";
const layer2LockConfig = Config.layer2_lock;

export interface DepositionLockArgs {
  owner_lock_hash: Hash;
  layer2_lock: Script;
  cancel_timeout: PackedSince;
}

export function serializeArgs(args: DepositionLockArgs): HexString {
  const rollup_type_hash: Hash = getRollupTypeHash();

  const serializedDepositionLockArgs: ArrayBuffer = SerializeDepositionLockArgs(
    NormalizeDepositionLockArgs(args)
  );

  const depositionLockArgsStr: HexString = new Reader(
    serializedDepositionLockArgs
  ).serializeJson();

  return rollup_type_hash + depositionLockArgsStr.slice(2);
}

export function generateDepositionLock(
  config: DeploymentConfig,
  args: HexString
): Script {
  return {
    code_hash: config.deposition_lock.code_hash,
    hash_type: config.deposition_lock.hash_type,
    args: args,
  };
}

export function getDepositionLockArgs(
  ownerLockHash: Hash,
  layer2_lock_args: HexString,
  cancelTimeout: PackedSince = "0xc00000000002a300"
): DepositionLockArgs {
  const depositionLockArgs: DepositionLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: {
      code_hash: layer2LockConfig.code_hash,
      hash_type: layer2LockConfig.hash_type as "data" | "type",
      args: layer2_lock_args,
    },
    cancel_timeout: cancelTimeout, // relative timestamp, 2 days
  };
  return depositionLockArgs;
}

export function getRollupTypeHash(): HexString {
  const rollupTypeScript: Script = runnerConfig.godwokenConfig.chain
    .rollup_type_script as Script;
  const hash: HexString = utils.computeScriptHash(rollupTypeScript);

  console.log("rollupTypeHash:", hash);

  return hash;
}
