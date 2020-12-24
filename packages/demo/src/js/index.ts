import { DeploymentConfig } from "./base";
import { CellDep, HexString, Script } from "./base/lumos-types";
import { DepositionLockArgs, generateDepositionLock, send, serializeArgs } from "./transaction";

console.log("something");

async function test() {
  console.log("test start");

  const depositionLockArgs: DepositionLockArgs = {
    owner_lock_hash: "0x1f2615a8dde4e28ca736ff763c2078aff990043f4cbf09eb4b3a58a140a0862d",
    layer2_lock: {
      code_hash: "0x" + "0".repeat(64),
      hash_type: "data",
      args: "0x",
    },
    cancel_timeout: BigInt(10000),
  };

  const rollup_type_hash = "0x" + "1".repeat(64);

  const serializedArgs: HexString = serializeArgs(
    rollup_type_hash,
    depositionLockArgs,
  )

  const mockScript: Script = {
    code_hash: "0x" + "0".repeat(64),
    hash_type: "data",
    args: "0x",
  };
  const mockCellDep: CellDep = {
    out_point: {
      tx_hash: "0x" + "1".repeat(64),
      index: "0x0",
    },
    dep_type: "code",
  }

  const config: DeploymentConfig = {
    deposition_lock: mockScript,
    custodian_lock: mockScript,
    state_validator_lock: mockScript,
    state_validator_type: mockScript,

    deposition_lock_dep: mockCellDep,
    custodian_lock_dep: mockCellDep,
    state_validator_lock_dep: mockCellDep,
    state_validator_type_dep: mockCellDep,
  }

  const depositionLock: Script = generateDepositionLock(config, serializedArgs);

  const txHash: HexString = await send(depositionLock, '200', 1000);

  console.log("txHash:", txHash);

  return txHash
};

setTimeout(async() => {
  await test();
}, 3000);
