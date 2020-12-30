import PWCore, {
  EthProvider,
  LumosConfigs,
  parseAddress,
  PwCollector,
} from "@lay2/pw-core";
import { DeploymentConfig } from "./base";
import { CellDep, Hash, HexString, Script, utils } from "@ckb-lumos/base";
import runnerConfig from "../configs/runner_config.json";
import { sendSudtTx, sendTx } from "./operations/deposition";
import { getCurrentEthAccount } from "./utils/eth_account";
import {
  getBalanceByEthAddress,
  getAccountIdByEthAddress,
  executeL2Transaction,
  submitL2Transaction,
  deployContract,
  getLayer2LockHash,
} from "./polyjuice";
import Config from "../configs/config.json";
import { SimpleStorage } from "@godwoken-examples/polyjuice";
import { Godwoken } from "@godwoken-examples/godwoken";
import { query, transfer, withdraw } from "./godwoken";
import { ckbUrl, pwCollectorUrl, godwokenUrl } from "./url";

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
  const pwcore = await new PWCore(ckbUrl).init(
    new EthProvider(),
    new PwCollector(pwCollectorUrl)
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
    await sendTx(pwcore, config, amount, currentEthAccount.toLowerCase());
  };

  const button = document.querySelector<HTMLElement>("#submit-amount");
  if (button) {
    button.onclick = submitAmountButton;
  }

  depositSudt(pwcore, currentEthAccount);
}

async function depositSudt(pwcore: PWCore, ethAddress: string) {
  const getValue = (): string => {
    const amountInputValue = document.querySelector<HTMLInputElement>(
      "#deposit-sudt-amount"
    )?.value;
    console.log("amountInputValue:", amountInputValue);

    if (!amountInputValue) {
      alert("must set amount!");
    }

    return amountInputValue as string;
  };

  const getSudtArgs = (): string => {
    const inputValue = document.querySelector<HTMLInputElement>(
      "#deposit-sudt-script-args"
    )?.value;
    console.log("sudt script args:", inputValue);

    if (!inputValue) {
      alert("must set sudt script args!");
    }

    return inputValue as string;
  };

  const submitAmountButton = async () => {
    const amount = getValue();
    const scriptArgs = getSudtArgs();
    await sendSudtTx(
      pwcore,
      config,
      amount,
      scriptArgs,
      ethAddress.toLowerCase()
    );
  };

  const button = document.querySelector<HTMLElement>("#deposit-sudt-submit");
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

    const runResult = await submitL2Transaction(
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
// sendPolyjuiceTx();

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
    const fromId = currentAccountID;
    const value: string = getRequiredInputValue("value");
    const data: string = SimpleStorage.initCode();

    console.log("Deploy SimpleStorage Parmas:", {
      sudt_id: sudtId,
      creator_account_id: creatorAccountId,
      from_id: fromId,
      to_id: 0,
      value: value,
      data: data,
    });

    const [
      runResult,
      deployedScriptHash,
      contractAccountId,
    ] = await deployContract(
      +sudtId,
      +creatorAccountId,
      fromId,
      BigInt(value),
      data
    );

    const errorMessage: string | undefined = (runResult as any).message;
    if (errorMessage) {
      alert(errorMessage);
    }

    document.querySelector(
      "#deployed-script-hash"
    )!.innerHTML = deployedScriptHash?.toString();

    const setContractAccountId = (accountId: number | null) => {
      const str = accountId
        ? accountId.toString()
        : "Still null, please click here to query later :D";
      document.querySelector("#deployed-account-id")!.innerHTML = str;
    };

    setContractAccountId(contractAccountId);

    document.querySelector<HTMLElement>(
      "#deployed-account-id"
    )!.onclick = async () => {
      const godwoken = new Godwoken(godwokenUrl);
      const accountId = await godwoken.getAccountIdByScriptHash(
        deployedScriptHash
      );
      setContractAccountId(accountId);
    };
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

export async function simpleStorageSet() {
  console.log("SimpleStorage Set");

  fillSelectOptions("#ss-set-sudt-id", polyjuiceConfig.sudt_ids);
  fillSelectOptions(
    "#ss-set-creator-account-id",
    polyjuiceConfig.creator_account_ids
  );
  document.querySelector<HTMLInputElement>(
    "#ss-set-to-id"
  )!.value = Config.polyjuice.simple_storage_account_id.toString();

  const currentEthAddress: string = await getCurrentEthAccount();
  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#ss-set-${id}`)?.value;
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
    const fromId = currentAccountID;
    const toId = getRequiredInputValue("to-id");
    const value: string = getRequiredInputValue("value");
    const dataValue: string = getRequiredInputValue("data-value");
    const data: string = SimpleStorage.setValue(BigInt(dataValue));

    console.log("SimpleStorage Set Parmas:", {
      sudt_id: sudtId,
      creator_account_id: creatorAccountId,
      from_id: fromId,
      to_id: toId,
      value: value,
      data: data,
    });

    const runResult = await submitL2Transaction(
      +sudtId,
      +creatorAccountId,
      fromId,
      +toId,
      BigInt(value),
      data
    );
  };

  const button = document.querySelector<HTMLElement>("#ss-set-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
simpleStorageSet();

export async function simpleStorageGet() {
  console.log("SimpleStorage Set");

  fillSelectOptions("#ss-get-sudt-id", polyjuiceConfig.sudt_ids);
  fillSelectOptions(
    "#ss-get-creator-account-id",
    polyjuiceConfig.creator_account_ids
  );
  document.querySelector<HTMLInputElement>(
    "#ss-get-to-id"
  )!.value = Config.polyjuice.simple_storage_account_id.toString();

  const currentEthAddress: string = await getCurrentEthAccount();
  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#ss-get-${id}`)?.value;
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
    const fromId = currentAccountID;
    const toId = getRequiredInputValue("to-id");
    const value: bigint = BigInt(0);
    const data: string = SimpleStorage.getValue();

    console.log("SimpleStorage Get Parmas:", {
      sudt_id: +sudtId,
      creator_account_id: +creatorAccountId,
      from_id: fromId,
      to_id: +toId,
      value: value,
      data: data,
    });

    const runResult = await executeL2Transaction(
      +sudtId,
      +creatorAccountId,
      fromId,
      +toId,
      value,
      data
    );

    if ((runResult as any).message) {
      alert((runResult as any).message);
    }

    const returnData = runResult?.return_data;
    if (returnData) {
      const parsedData = SimpleStorage.parseReturnData(returnData);
      document.querySelector<HTMLElement>(
        "#ss-get-result"
      )!.innerHTML = parsedData.toString();
    } else {
      document.querySelector<HTMLElement>("#ss-get-result")!.innerHTML =
        "failed";
    }
  };

  const button = document.querySelector<HTMLElement>("#ss-get-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
simpleStorageGet();

export async function godwokenQuerySudt() {
  console.log("godwokenQuerySudt");

  fillSelectOptions("#query-sudt-to-id", polyjuiceConfig.sudt_ids);

  const currentEthAddress: string = await getCurrentEthAccount();
  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  document.querySelector<HTMLInputElement>(
    "#query-sudt-account-id"
  )!.value = currentAccountID.toString();

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#query-sudt-${id}`)?.value;
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
    const fromId = currentAccountID;
    const toId = +getRequiredInputValue("to-id");
    const accountId = +getRequiredInputValue("account-id");

    console.log("Godwoken Query SUDT Params:", {
      from_id: fromId,
      to_id: toId,
      account_id: accountId,
    });

    let sudtBalance: bigint | undefined;
    try {
      sudtBalance = await query(fromId, toId, accountId);
    } catch (e) {
      alert(e.message);
    }

    if (sudtBalance !== undefined && sudtBalance !== null) {
      document.querySelector<HTMLElement>(
        "#query-sudt-result"
      )!.innerHTML = sudtBalance.toString();
    } else {
      document.querySelector<HTMLElement>("#query-sudt-result")!.innerHTML =
        "failed";
    }
  };

  const button = document.querySelector<HTMLElement>("#query-sudt-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
godwokenQuerySudt();

export async function godwokenSudtTransfer() {
  console.log("godwokenSudtTransfer");

  fillSelectOptions("#transfer-sudt-sudt-id", polyjuiceConfig.sudt_ids);

  const currentEthAddress: string = await getCurrentEthAccount();
  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#transfer-sudt-${id}`)
      ?.value;
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
    const fromId = currentAccountID;
    const sudtId = +getRequiredInputValue("sudt-id");
    const toId = +getRequiredInputValue("to-id");
    const amount = BigInt(getRequiredInputValue("amount"));
    const fee = BigInt(getRequiredInputValue("fee"));

    console.log("Godwoken SUDT Transafer Params:", {
      from_id: fromId,
      to_id: toId,
      sudtId: sudtId,
      amount: amount,
      fee: fee,
    });

    try {
      await transfer(fromId, toId, sudtId, amount, fee);
      alert("transfer success!");
    } catch (e) {
      alert(e.message);
    }

    // if (sudtBalance !== undefined && sudtBalance !== null) {
    //   document.querySelector<HTMLElement>(
    //     "#query-sudt-result"
    //   )!.innerHTML = sudtBalance.toString();
    // } else {
    //   document.querySelector<HTMLElement>("#query-sudt-result")!.innerHTML =
    //     "failed";
    // }
  };

  const button = document.querySelector<HTMLElement>("#transfer-sudt-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
godwokenSudtTransfer();

export async function godwokenWithdraw() {
  console.log("godwokenWithdraw");

  fillSelectOptions(
    "#withdrawal-sudt-script-hash",
    Config.godwoken.sudt_script_hashes
  );

  const currentEthAddress: string = await getCurrentEthAccount();
  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  document.querySelector<HTMLInputElement>(
    "#withdrawal-eth-address"
  )!.value = currentEthAddress;

  const getInputValue = (id: string): string | undefined => {
    return document.querySelector<HTMLInputElement>(`#withdrawal-${id}`)?.value;
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
    const fromId = currentAccountID;
    const capacity: bigint = BigInt(getRequiredInputValue("capacity"));
    const amount: bigint = BigInt(getRequiredInputValue("amount"));
    const sudtScriptHash: Hash = getRequiredInputValue("sudt-script-hash");
    const ethAddress: string = getRequiredInputValue(
      "eth-address"
    ).toLowerCase();
    const l2LockHash: Hash = getLayer2LockHash(ethAddress);

    const ownerCkbAddress: string = getRequiredInputValue("owner-ckb-address");
    // TODO: using testnet config in default, if not script in genesis, may cause error in dev chain
    const lockScript = parseAddress(ownerCkbAddress, {
      config: LumosConfigs[1],
    });
    console.log("lockscript ---:", lockScript);
    const ownerLockHash: Hash = utils.computeScriptHash({
      code_hash: lockScript.code_hash,
      hash_type: lockScript.hash_type as "data" | "type",
      args: lockScript.args,
    });

    console.log("Godwoken Withdrawal Params:", {
      from_id: fromId,
      capacity: capacity,
      amount,
      sudt_script_hash: sudtScriptHash,
      l2_lock_hash: l2LockHash,
      owner_lock_hash: ownerLockHash,
    });

    try {
      await withdraw(
        fromId,
        capacity,
        amount,
        sudtScriptHash,
        l2LockHash,
        ownerLockHash
      );
      alert("withdraw success!");
    } catch (e) {
      alert(e.message);
      throw e;
    }

    // if (sudtBalance !== undefined && sudtBalance !== null) {
    //   document.querySelector<HTMLElement>(
    //     "#query-sudt-result"
    //   )!.innerHTML = sudtBalance.toString();
    // } else {
    //   document.querySelector<HTMLElement>("#query-sudt-result")!.innerHTML =
    //     "failed";
    // }
  };

  const button = document.querySelector<HTMLElement>("#withdrawal-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
godwokenWithdraw();
