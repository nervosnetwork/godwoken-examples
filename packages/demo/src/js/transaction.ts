import PWCore, { Address, Amount, Script as PwScript, HashType, EthProvider, PwCollector } from "@lay2/pw-core";
import { Reader } from "ckb-js-toolkit";
import { SerializeDepositionLockArgs } from "../schemas/godwoken";
import { DeploymentConfig } from "./base"
import { Script, HexString, Hash } from "./base/lumos-types"
import { NormalizeDepositionLockArgs } from "./base/normalizer"

export interface DepositionLockArgs {
  owner_lock_hash: Hash,
  layer2_lock: Script,
  cancel_timeout: bigint,
}

export function serializeArgs(rollup_type_hash: Hash, args: DepositionLockArgs): HexString {
  validateRollupTypeHash(rollup_type_hash);

  const serializedDepositionLockArgs: ArrayBuffer = SerializeDepositionLockArgs(NormalizeDepositionLockArgs({
    owner_lock_hash: args.owner_lock_hash,
    layer2_lock: args.layer2_lock,
    cancel_timeout: "0x" + args.cancel_timeout.toString(16),
  }));

  const depositionLockArgsStr: HexString = new Reader(serializedDepositionLockArgs).serializeJson();

  return rollup_type_hash + depositionLockArgsStr.slice(2);
}

export function generateDepositionLock(config: DeploymentConfig, args: HexString): Script {
  return {
    code_hash: config.deposition_lock.code_hash,
    hash_type: config.deposition_lock.hash_type,
    args: args,
  }
}

function validateRollupTypeHash(rollup_type_hash: string) {
  if (!rollup_type_hash.startsWith("0x")) {
    throw new Error(`rollup_type_hash: ${rollup_type_hash} must start with 0x!`);
  }

  if (rollup_type_hash.length !== 66) {
    throw new Error(`rollup_type_hash: ${rollup_type_hash} must be 32-byte length!`);
  }
}

function scriptToPwScript(script: Script): PwScript {
  const hash_type = script.hash_type === "type" ? HashType.type : HashType.data;
  return new PwScript(script.code_hash, script.args, hash_type);
}

// amount is ckb, like '61.1' means 61.1 CKB, 6_110_000_000 shannons
export async function send(targetLock: Script, amount: string, feeRate?: number): Promise<HexString> {
  const pwLock: PwScript = scriptToPwScript(targetLock);

  const address: Address = Address.fromLockScript(pwLock);

  // TODO: update links
  const pwcore = await new PWCore("http://localhost:8114").init(
    new EthProvider(),
    new PwCollector('https://cellapitest.ckb.pw'),
  );

  const txHash: HexString = await pwcore.send(
    address,
    new Amount(amount.toString()),
    feeRate,
  );

  return txHash
}

// TODO: sudt
// export class DepositionBuilder extends Builder {
//   constructor(
//     private targetLock: PwScript,
//     private amount: Amount,
//     feeRate?: number,
//     collector?: Collector,
//   ) {
//     super(feeRate, collector);
//   }

//   async build(fee: Amount = Amount.ZERO): Promise<Transaction> {
//     const outputCell: Cell = new Cell(this.amount, this.targetLock);
//     const neededAmount: Amount = this.amount.add(Builder.MIN_CHANGE).add(fee);
//     let inputSum = new Amount('0');
//     const inputCells: Cell[] = [];

//     // fill the inputs
//     const cells = await this.collector.collect(PWCore.provider.address, {
//       neededAmount,
//     });
//     for (const cell of cells) {
//       inputCells.push(cell);
//       inputSum = inputSum.add(cell.capacity);
//       if (inputSum.gt(neededAmount)) {
//         break;
//       }
//     }

//     if (inputSum.lt(neededAmount)) {
//       throw new Error(
//         `input capacity not enough, need ${neededAmount.toString(
//           AmountUnit.ckb
//         )}, got ${inputSum.toString(AmountUnit.ckb)}`
//       );
//     }

//     const changeCell = new Cell(
//       inputSum.sub(outputCell.capacity),
//       PWCore.provider.address.toLockScript()
//     );

//     const tx = new Transaction(
//       new RawTransaction(inputCells, [outputCell, changeCell]),
//       [Builder.WITNESS_ARGS.Secp256k1]
//     );

//     this.fee = Builder.calcFee(tx, this.feeRate);

//     if (changeCell.capacity.gte(Builder.MIN_CHANGE.add(this.fee))) {
//       changeCell.capacity = changeCell.capacity.sub(this.fee);
//       tx.raw.outputs.pop();
//       tx.raw.outputs.push(changeCell);
//       return tx;
//     }

//     return this.build(this.fee);
//   }
// }

// export function generateBuilder(
//   config: DeploymentConfig,
//   rollup_type_hash: Hash,
//   args: DepositionLockArgs,
//   amount: HexNumber,
//   feeRate?: number,
// ): DepositionBuilder {
//   const serializedArgs: HexString = serializeArgs(rollup_type_hash, args);
//   const targetLock: Script = generateDepositionLock(config, serializedArgs);
//   const pwLock: PwScript = scriptToPwScript(targetLock);
//   return new DepositionBuilder(
//     pwLock,
//     new Amount(BigInt(amount).toString()),
//     feeRate,
//   );
// }
