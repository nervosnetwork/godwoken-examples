import { DeploymentConfig } from "./base";
import { CellDep, HexString, Script } from "@ckb-lumos/base";
import { DepositionLockArgs, generateDepositionLock, initPWCore, send, serializeArgs } from "./transaction";
import { Address, AddressType } from "@lay2/pw-core"
import runnerConfig from "../configs/runner_config.json";
import { utils } from "../utils"

console.log("something");

const deploymentConfig = runnerConfig.deploymentConfig;

const config: DeploymentConfig = {
  deposition_lock: deploymentConfig.deposition_lock as Script,
  custodian_lock: deploymentConfig.custodian_lock as Script,
  state_validator_lock: deploymentConfig.state_validator_lock as Script,
  state_validator_type: deploymentConfig.state_validator_type as Script,

  deposition_lock_dep: deploymentConfig.deposition_lock_dep as CellDep,
  custodian_lock_dep: deploymentConfig.custodian_lock_dep as CellDep,
  state_validator_lock_dep: deploymentConfig.state_validator_lock_dep as CellDep,
  state_validator_type_dep: deploymentConfig.state_validator_type_dep as CellDep,
}

async function sendTx(amount: string) {
  const lockScript: Script = await getCurrentLockScript();
  const ownerLockHash: HexString = utils.computeScriptHash(lockScript);

  const depositionLockArgs: DepositionLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: {
      code_hash: "0x" + "0".repeat(64),
      hash_type: "data",
      args: "0x",
    },
    cancel_timeout: "0xc00000000002a300", // relative timestamp, 2 days
  };

  console.log("depositionLockArgs:", depositionLockArgs);

  const rollup_type_hash: HexString = getRollupTypeHash();

  const serializedArgs: HexString = serializeArgs(
    rollup_type_hash,
    depositionLockArgs,
  )

  console.log("serializedArgs:", serializedArgs);

  const depositionLock: Script = generateDepositionLock(config, serializedArgs);

  console.log("depositionLock:", depositionLock);

  const txHash: HexString = await send(depositionLock, amount, 1000);

  console.log("txHash:", txHash);

  return txHash
};

async function getCurrentEthAccount(): Promise<string> {
  const accounts = (await (window as any).ethereum.send('eth_requestAccounts')).result
  // console.log("accounts:", accounts);
  // console.log("???")

  if (accounts.length === 0) {
    console.error("No metamask accounts found!");
  }

  // const currentAccount: string = accounts[0]
  return accounts[0];
}

async function getCurrentLockScript(): Promise<Script> {
  await initPWCore();
  const ethAddress: string = await getCurrentEthAccount();

  const address: Address = new Address(ethAddress, AddressType.eth);

  const script = address.toLockScript();

  return {
    code_hash: script.codeHash,
    hash_type: script.hashType,
    args: script.args,
  }
}


function getRollupTypeHash(): HexString {
  const rollupTypeScript: Script = runnerConfig.godwokenConfig.chain.rollup_type_script as Script;
  const hash: HexString = utils.computeScriptHash(rollupTypeScript);

  console.log("rollupTypeHash:", hash);

  return hash;
}
