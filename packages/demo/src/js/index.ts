import PWCore, { EthProvider, PwCollector } from "@lay2/pw-core";
import { DeploymentConfig } from "./base";
import { CellDep, Hash, HexString, Script } from "@ckb-lumos/base";
import runnerConfig from "../configs/runner_config.json";
import { sendTx } from "./operations/deposition";
import { getCurrentEthAccount } from "./utils/eth_account";
import {
  sendTransaction,
  getBalanceByEthAddress,
  getAccountIdByEthAddress,
} from "./polyjuice";
import Config from "../configs/config.json";

const polyjuiceConfig = Config.polyjuice;

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

  fillSelectOptions("#polyjuice-sudt-id", polyjuiceConfig.sudt_ids);
  fillSelectOptions(
    "#polyjuice-creator-account-id",
    polyjuiceConfig.creator_account_ids
  );

  const currentEthAddress: string = await getCurrentEthAccount();
  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);
  document.querySelector<HTMLInputElement>(
    `#polyjuice-from-id`
  )!.value = currentAccountID.toString();

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

    // const args: string = getRequiredInputValue("args");
    // console.log("args:", args);

    const runResult = await sendTransaction(
      +sudtId,
      +creatorAccountId,
      +fromId,
      +toId,
      BigInt(value),
      data
    );

    console.log("send polyjuice runResult:", runResult);
  };

  const button = document.querySelector<HTMLElement>("#polyjuice-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
sendPolyjuiceTx();

export async function deploySimpleStorage() {
  console.log("Deploy SimpleStorage");

  fillSelectOptions("#deploy-sudt-id", polyjuiceConfig.sudt_ids);
  fillSelectOptions(
    "#deploy-creator-account-id",
    polyjuiceConfig.creator_account_ids
  );

  const currentEthAddress: string = await getCurrentEthAccount();
  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#deploy-${id}`)?.value;
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
    const creatorAccountId: string = getRequiredInputValue(
      "creator-account-id"
    );
    const toId = 0;
    const value: string = getRequiredInputValue("value");
    const data: string =
      "0x60806040525b607b60006000508190909055505b610018565b60db806100266000396000f3fe60806040526004361060295760003560e01c806360fe47b114602f5780636d4ce63c14605b576029565b60006000fd5b60596004803603602081101560445760006000fd5b81019080803590602001909291905050506084565b005b34801560675760006000fd5b50606e6094565b6040518082815260200191505060405180910390f35b8060006000508190909055505b50565b6000600060005054905060a2565b9056fea2646970667358221220044daf4e34adffc61c3bb9e8f40061731972d32db5b8c2bc975123da9e988c3e64736f6c63430006060033";

    console.log("Deploy SimpleStorage Parmas:", {
      sudt_id: sudtId,
      creator_account_id: creatorAccountId,
      from_id: currentAccountID,
      to_id: toId,
      value: value,
      data: data,
    });

    const runResult = await sendTransaction(
      +sudtId,
      +creatorAccountId,
      currentAccountID,
      +toId,
      BigInt(value),
      data
    );

    console.log("Deploy SimpleStorage runResult:", runResult);
  };

  const button = document.querySelector<HTMLElement>("#deploy-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
deploySimpleStorage();

// balance
export async function displayBalance() {
  const currentEthAddress: string = await getCurrentEthAccount();

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#balance-${id}`)?.value;
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

  fillSelectOptions(`#balance-sudt-id`, polyjuiceConfig.sudt_ids);

  const submitButton = async () => {
    const sudtId: string = getRequiredInputValue("sudt-id");
    console.log("sudt id:", sudtId);

    const balance: bigint = await getBalanceByEthAddress(
      +sudtId,
      currentEthAddress
    );

    console.log("get balance:", balance);

    const balanceElement = document.querySelector<HTMLElement>(
      "#balance-value"
    );
    if (balanceElement) {
      balanceElement.innerHTML = balance.toString();
    }
  };

  const button = document.querySelector<HTMLElement>("#balance-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
displayBalance();

function fillSelectOptions(elementId: string, options: any): void {
  const element = document.querySelector<HTMLElement>(elementId);
  if (element === undefined || element === null) {
    throw new Error(`element: ${elementId} not found!`);
  }

  let optionsHtml = "";
  for (const key in options) {
    const value = options[key];
    optionsHtml += `<option value="${value}">${key}</option>\n`;
  }
  element.innerHTML = optionsHtml;
}
