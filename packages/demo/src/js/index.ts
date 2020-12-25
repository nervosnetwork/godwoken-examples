import PWCore, { EthProvider, PwCollector } from "@lay2/pw-core";
import { DeploymentConfig } from "./base";
import { CellDep, Script } from "@ckb-lumos/base";
import runnerConfig from "../configs/runner_config.json";
import { sendTx } from "./operations/deposition";

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
};

export async function initPWCore() {
  const pwcore = await new PWCore("http://localhost:8114").init(
    new EthProvider(),
    new PwCollector("https://cellapitest.ckb.pw")
  );
  return pwcore;
}

async function main() {
  const pwcore = await initPWCore();

  const getValue = (): string => {
    const amountInputValue = document.querySelector<HTMLInputElement>("#amount")
      ?.value;
    console.log("amountInputValue:", amountInputValue);

    if (!amountInputValue) {
      alert("must set amount!");
    }

    return amountInputValue as string;
  };

  const submitAmountButton = async () => {
    const amount = getValue();
    await sendTx(pwcore, config, amount);
  };

  const button = document.querySelector<HTMLElement>("#submit-amount");
  if (button) {
    button.onclick = submitAmountButton;
  }
}

main();
