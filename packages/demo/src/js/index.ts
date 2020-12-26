import PWCore, { EthProvider, PwCollector } from "@lay2/pw-core";
import { DeploymentConfig } from "./base";
import { CellDep, Hash, HexString, Script } from "@ckb-lumos/base";
import runnerConfig from "../configs/runner_config.json";
import { sendTx } from "./operations/deposition";
import { getCurrentEthAccount } from "./utils/eth_account";
import { sendTransaction } from "./polyjuice";

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
  const currentEthAccount: string = await getCurrentEthAccount();
  console.log("current eth address:", currentEthAccount);
  displayEthAddress(currentEthAccount);

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

// display current eth address
function displayEthAddress(address: string) {
  const currentEthAddressElement = document.querySelector<HTMLElement>(
    "#current-eth-address"
  );
  if (currentEthAddressElement) {
    currentEthAddressElement.innerHTML = address;
  }
}

main();

// sendPolyjuiceTx();

export async function sendPolyjuiceTx() {
  console.log("sendPolyjuiceTx");

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#polyjuice-${id}`)?.value;
  };

  const checkValue = (name: string, value: string | undefined) => {
    if (!value) {
      const msg = `${name} is required!`;
      alert(msg);
      throw new Error(msg);
    }
  };

  const getRequiredInputValue = (id: string): string => {
    const value: string | undefined = getInputValue(id);
    checkValue(id, value);
    return value as string;
  };

  const submitButton = async () => {
    const sudtId: string = getRequiredInputValue("sudt-id");
    console.log("sudt id:", sudtId);

    const creatorAccountId: string = getRequiredInputValue(
      "creator-account-id"
    );
    console.log("creatorAccountId:", creatorAccountId);

    const fromId: string = getRequiredInputValue("from-id");
    console.log("fromId:", fromId);

    const toId: string = getRequiredInputValue("to-id");
    console.log("toId:", toId);

    const value: string = getRequiredInputValue("value");
    console.log("value:", value);

    const data: string = getRequiredInputValue("data");
    console.log("data:", data);

    const args: string = getRequiredInputValue("args");
    console.log("args:", args);

    const txHash: Hash = await sendTransaction(
      +sudtId,
      +creatorAccountId,
      +fromId,
      +toId,
      BigInt(value),
      data,
      args
    );

    console.log("send polyjuice txHash:", txHash);
  };

  const button = document.querySelector<HTMLElement>("#polyjuice-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
sendPolyjuiceTx();
