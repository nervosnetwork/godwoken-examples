import { Reader } from "ckb-js-toolkit";
import {
  SerializeCustodianLockArgs,
  SerializeDepositLockArgs,
} from "@godwoken-examples/godwoken/schemas";
import { DeploymentConfig } from "./deployment-config";
import {
  Script,
  HexString,
  Hash,
  PackedSince,
  utils,
  Cell,
  HexNumber,
} from "@ckb-lumos/base";
import {
  NormalizeDepositLockArgs,
  CustodianLockArgs,
  NormalizeCustodianLockArgs,
} from "@godwoken-examples/godwoken/lib/normalizer";
import { minimalCellCapacity } from "@ckb-lumos/helpers";
const godwokenConfig = require("../../configs/godwoken-config.json");

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

export function minimalDepositCapacity(
  output: Cell,
  depositLockArgs: DepositLockArgs
): bigint {
  // fixed size, the specific value is not important.
  const dummyHash: Hash = "0x" + "00".repeat(32);
  const dummyHexNumber: HexNumber = "0x0";
  const rollupTypeHash: Hash = dummyHash;

  const custodianLockArgs: CustodianLockArgs = {
    deposit_block_hash: dummyHash,
    deposit_block_number: dummyHexNumber,
    deposit_lock_args: depositLockArgs,
  };

  const serializedCustodianLockArgs: HexString = new Reader(
    SerializeCustodianLockArgs(NormalizeCustodianLockArgs(custodianLockArgs))
  ).serializeJson();

  const args = rollupTypeHash + serializedCustodianLockArgs.slice(2);

  const lock: Script = {
    code_hash: dummyHash,
    hash_type: "data",
    args,
  };

  const cell: Cell = {
    ...output,
    cell_output: {
      ...output.cell_output,
      lock,
    },
  };
  const capacity: bigint = minimalCellCapacity(cell);

  return capacity;
}
