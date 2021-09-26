import {
  Cell,
  CellDep,
  Hash,
  HexString,
  utils,
  WitnessArgs,
  core as baseCore,
  Transaction,
  OutPoint,
  Script,
} from "@ckb-lumos/base";
import {
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
} from "@ckb-lumos/helpers";
import { CellCollector, Indexer } from "@ckb-lumos/indexer";
import { deploymentConfig } from "../modules/deployment-config";
import {
  ROLLUP_TYPE_HASH,
  ROLLUP_TYPE_SCRIPT,
} from "../modules/godwoken-config";
import { asyncSleep, privateKeyToCkbAddress } from "../modules/utils";
import { exit } from "process";
import { core, normalizer } from "@godwoken-examples/godwoken";
import { normalizers, Reader } from "ckb-js-toolkit";
import { common } from "@ckb-lumos/common-scripts";
import { key } from "@ckb-lumos/hd";
import { Command } from "commander";
import { initConfigAndSync } from "./common";
import { getConfig } from "@ckb-lumos/config-manager";
import { RPC } from "@ckb-lumos/rpc";

async function unlock(
  privateKey: HexString,
  indexer: Indexer,
  rpc: RPC,
  sudtScript?: Script,
  retryTime = 10
) {
  try {
    for (let i = 0; i < retryTime; i++) {
      if (i > 0) {
        console.log("-".repeat(15) + ` Retry ${i} ` + "-".repeat(15));
      }

      const isRetry = await unlockInner(privateKey, indexer, rpc, sudtScript);
      if (!isRetry) {
        break;
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(-1);
  }
}

/**
 *
 * @param privateKey
 * @param indexer
 * @param rpc
 * @param sudtScript
 *
 * @returns should retry again or not, if true, try again
 */
async function unlockInner(
  privateKey: HexString,
  indexer: Indexer,
  rpc: RPC,
  sudtScript?: Script
): Promise<boolean> {
  const rollup_type_script = ROLLUP_TYPE_SCRIPT;
  const rollup_type_hash: Hash = ROLLUP_TYPE_HASH;
  console.log("rollup_type_hash:", rollup_type_hash);

  const withdrawalLockDep: CellDep = deploymentConfig.withdrawal_lock_dep;

  const ckb_address = privateKeyToCkbAddress(privateKey);
  console.log("ckb address:", ckb_address);

  const lock_script = parseAddress(ckb_address);
  const lock_script_hash = utils.computeScriptHash(lock_script);

  // Ready to build L1 CKB transaction

  // * search rollup cell then get last_finalized_block_number from cell data (GlobalState)
  const rollupCollector = new CellCollector(indexer, {
    type: rollup_type_script,
  });
  let rollup_cell: Cell | undefined = undefined;
  for await (const cell of rollupCollector.collect()) {
    rollup_cell = cell;
    break;
  }

  if (rollup_cell == null) {
    console.error("[ERROR]: rollup_cell not found");
    exit(-1);
  }
  const globalState = new core.GlobalState(new Reader(rollup_cell.data));
  const last_finalized_block_number = globalState
    .getLastFinalizedBlockNumber()
    .toLittleEndianBigUint64();

  console.log("last_finalized_block_number", last_finalized_block_number);

  // * use rollup cell's out point as cell_deps
  const rollup_cell_dep: CellDep = {
    out_point: rollup_cell.out_point!,
    dep_type: "code",
  };

  // * search withdrawal locked cell by:
  //   - withdrawal lock code hash
  //   - owner secp256k1 blake2b160 lock hash
  //   - last_finalized_block_number
  //   - TODO: withdrawal_block_hash (to proof the block is on current rollup)
  const withdrawal_lock = deploymentConfig.withdrawal_lock;
  const withdrawalCollector = new CellCollector(indexer, {
    lock: {
      code_hash: withdrawal_lock.code_hash,
      hash_type: withdrawal_lock.hash_type,
      args: rollup_type_hash, // prefix search
    },
    type: sudtScript ? sudtScript : "empty",
    argsLen: "any",
  });
  const withdrawal_cells = [];
  for await (const cell of withdrawalCollector.collect()) {
    // console.log("[DEBUG]: withdrawalCell:", cell.out_point);
    const lock_args = cell.cell_output.lock.args;
    const withdrawal_lock_args_data = "0x" + lock_args.slice(66);
    const withdrawal_lock_args = new core.WithdrawalLockArgs(
      new Reader(withdrawal_lock_args_data)
    );
    const owner_lock_hash = new Reader(
      withdrawal_lock_args.getOwnerLockHash().raw()
    ).serializeJson();
    if (owner_lock_hash !== lock_script_hash) {
      // console.log(
      //   `[INFO]: owner_lock_hash not match, expected: ${lock_script_hash}, actual: ${owner_lock_hash}`
      // );
      continue;
    }

    console.log("[DEBUG]: withdrawalCell:", cell);

    const withdrawal_block_number = withdrawal_lock_args
      .getWithdrawalBlockNumber()
      .toLittleEndianBigUint64();
    console.log("withdrawal_block_number", withdrawal_block_number);
    if (withdrawal_block_number > last_finalized_block_number) {
      console.log("[INFO]: withdrawal cell not finalized");
      continue;
    }

    withdrawal_cells.push(cell);
  }
  if (withdrawal_cells.length == 0) {
    console.warn("[ERROR]: No valid withdrawal cell found");
    exit(-1);
  }
  console.log(
    `[INFO] found ${withdrawal_cells.length} withdrawal cells, only process first one`
  );
  const withdrawal_cell = withdrawal_cells[0];
  const output_cell: Cell = {
    cell_output: {
      capacity: withdrawal_cell.cell_output.capacity,
      lock: lock_script,
      type: withdrawal_cell.cell_output.type,
    },
    data: withdrawal_cell.data,
  };

  // * Build UnlockWithdrawal::UnlockWithdrawalViaFinalize and put into withess
  const data =
    "0x00000000" +
    new Reader(
      core.SerializeUnlockWithdrawalViaFinalize(
        normalizer.NormalizeUnlockWithdrawalViaFinalize({})
      )
    )
      .serializeJson()
      .slice(2);
  console.log("withdrawal_witness:", data);
  const new_witness_args: WitnessArgs = {
    lock: data,
  };
  const withdrawal_witness = new Reader(
    baseCore.SerializeWitnessArgs(
      normalizers.NormalizeWitnessArgs(new_witness_args)
    )
  ).serializeJson();

  let txSkeleton = TransactionSkeleton({ cellProvider: indexer });
  txSkeleton = txSkeleton
    .update("inputs", (inputs) => {
      return inputs.push(withdrawal_cell);
    })
    .update("outputs", (outputs) => {
      return outputs.push(output_cell);
    })
    .update("cellDeps", (cell_deps) => {
      return cell_deps.push(withdrawalLockDep);
    })
    .update("cellDeps", (cell_deps) => {
      return cell_deps.push(rollup_cell_dep);
    })
    .update("witnesses", (witnesses) => {
      return witnesses.push(withdrawal_witness);
    });

  if (!!sudtScript) {
    txSkeleton = txSkeleton.update("cellDeps", (cell_deps) => {
      return cell_deps.push(getSudtCellDep());
    });
  }

  txSkeleton = txSkeleton.update("fixedEntries", (fixedEntries) => {
    return fixedEntries.push({
      field: "outputs",
      index: 0,
    });
  });
  txSkeleton = await common.payFeeByFeeRate(
    txSkeleton,
    [ckb_address],
    BigInt(1000)
  );
  txSkeleton = common.prepareSigningEntries(txSkeleton);
  // console.log("tx:", JSON.stringify(txSkeleton.toJS(), null, 2))

  const message: HexString = txSkeleton.get("signingEntries").get(0)!.message;
  const content: HexString = key.signRecoverable(message, privateKey);
  const tx = sealTransaction(txSkeleton, [content]);

  let txHash: Hash | undefined;
  try {
    txHash = await rpc.send_transaction(tx, "passthrough");
    console.log("txHash:", txHash);
  } catch (err) {
    console.error("error when send transaction:", err);
    return true;
  }

  const isSuccess = await waitForTxCommitted(rpc, tx, txHash);
  if (isSuccess === false) {
    return true;
  }
  return false;
}

async function waitForTxCommitted(
  rpc: RPC,
  tx: Transaction,
  txHash: Hash,
  timeout = 300,
  loopInterval = 1
): Promise<boolean | undefined> {
  const getOutPointStr = (outPoint: OutPoint) =>
    `OutPoint { tx_hash: ${outPoint.tx_hash}, index: ${outPoint.index} }`;

  for (let i = 0; i < timeout; i += loopInterval) {
    const txWithStatus = await rpc.get_transaction(txHash);

    // tx failed
    if (txWithStatus === null) {
      for await (const cellDep of tx.cell_deps) {
        const liveCell = await rpc.get_live_cell(cellDep.out_point, false);
        if (liveCell.status !== "live") {
          console.log(
            `CellDep ${getOutPointStr(cellDep.out_point)} has already used!`
          );
        }
      }

      for await (const input of tx.inputs) {
        const liveCell = await rpc.get_live_cell(input.previous_output, false);
        if (liveCell.status !== "live") {
          console.log(
            `Input ${getOutPointStr(input.previous_output)} has already used!`
          );
        }
      }

      console.log("tx failed, please resend!");
      return false;
    }

    const status = txWithStatus.tx_status.status;
    if (status !== "committed") {
      console.log(
        `current tx status: ${status}, ... waiting for ${i} seconds`,
        status
      );
      await asyncSleep(loopInterval * 1000);
    } else {
      console.log(`tx ${txHash} committed!`);
      return true;
    }
  }

  console.log(`... timeout ... please check tx ${txHash} status by your self`);
  return undefined;
}

function getSudtScript(args: HexString): Script {
  const sudtInfo = getConfig().SCRIPTS.SUDT;
  if (sudtInfo === undefined || sudtInfo === null) {
    throw new Error("SUDT info not found in lumos config!");
  }
  return {
    code_hash: sudtInfo.CODE_HASH,
    hash_type: sudtInfo.HASH_TYPE,
    args,
  };
}

function getSudtCellDep(): CellDep {
  const sudtInfo = getConfig().SCRIPTS.SUDT;
  if (sudtInfo === undefined || sudtInfo === null) {
    throw new Error("SUDT info not found in lumos config!");
  }
  return {
    dep_type: sudtInfo.DEP_TYPE,
    out_point: {
      tx_hash: sudtInfo.TX_HASH,
      index: sudtInfo.INDEX,
    },
  };
}

export const run = async (program: Command) => {
  const ckbUrl = program.rpc;
  const ckbRpc = new RPC(ckbUrl);
  const indexerPath = program.indexerPath;
  const indexer = await initConfigAndSync(ckbUrl, indexerPath);

  const privateKey = program.privateKey;

  const sudtScriptArgs = program.sudtScriptArgs;

  let sudtScript = undefined;
  if (!!sudtScriptArgs) {
    sudtScript = getSudtScript(sudtScriptArgs);
  }

  try {
    await unlock(privateKey, indexer, ckbRpc, sudtScript);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};
