import PWCore, {
  Script as PwScript,
  HashType,
  Address,
  Amount,
  AddressType,
} from "@lay2/pw-core";
import { Script, HexString } from "@ckb-lumos/base";
import { utils } from "../../utils";
import {
  DepositionLockArgs,
  generateDepositionLock,
  getDepositionLockArgs,
  serializeArgs,
} from "../transactions/deposition";
import { DeploymentConfig } from "../base";

function scriptToPwScript(script: Script): PwScript {
  const hash_type = script.hash_type === "type" ? HashType.type : HashType.data;
  return new PwScript(script.code_hash, script.args, hash_type);
}

// amount is ckb, like '61.1' means 61.1 CKB, 6_110_000_000 shannons
export async function send(
  pwcore: PWCore,
  targetLock: Script,
  amount: string,
  feeRate?: number
): Promise<HexString> {
  const pwLock: PwScript = scriptToPwScript(targetLock);

  const address: Address = Address.fromLockScript(pwLock);

  const txHash: HexString = await pwcore.send(
    address,
    new Amount(amount.toString()),
    feeRate
  );

  return txHash;
}

export async function sendTx(
  pwcore: PWCore,
  deploymentConfig: DeploymentConfig,
  amount: string,
  layer2LockArgs: HexString = "0x"
) {
  const lockScript: Script = await getCurrentLockScript();
  const ownerLockHash: HexString = utils.computeScriptHash(lockScript);

  const depositionLockArgs: DepositionLockArgs = getDepositionLockArgs(
    ownerLockHash,
    layer2LockArgs
  );

  console.log("depositionLockArgs:", depositionLockArgs);

  const serializedArgs: HexString = serializeArgs(
    depositionLockArgs,
    utils.computeScriptHash
  );

  console.log("serializedArgs:", serializedArgs);

  const depositionLock: Script = generateDepositionLock(
    deploymentConfig,
    serializedArgs
  );

  console.log("depositionLock:", depositionLock);

  const txHash: HexString = await send(pwcore, depositionLock, amount, 1000);

  console.log("txHash:", txHash);

  return txHash;
}

async function getCurrentEthAccount(): Promise<string> {
  const accounts = (await (window as any).ethereum.send("eth_requestAccounts"))
    .result;
  // console.log("accounts:", accounts);
  // console.log("???")

  if (accounts.length === 0) {
    console.error("No metamask accounts found!");
  }

  // const currentAccount: string = accounts[0]
  return accounts[0];
}

async function getCurrentLockScript(): Promise<Script> {
  const ethAddress: string = await getCurrentEthAccount();

  const address: Address = new Address(ethAddress, AddressType.eth);

  const script = address.toLockScript();

  return {
    code_hash: script.codeHash,
    hash_type: script.hashType,
    args: script.args,
  };
}
