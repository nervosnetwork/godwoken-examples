import {
  fillSelectOptions,
  createGetRequiredInputValue,
  SUBMIT_SUCCESS_MESSAGE,
} from "./helpers";
import Config from "../../configs/config.json";
import {
  deployContract,
  executeL2Transaction,
  getAccountIdByEthAddress,
  submitL2Transaction,
} from "../polyjuice";
import { SimpleStorage } from "@godwoken-examples/polyjuice";
import { Godwoken, RunResult } from "@godwoken-examples/godwoken";
import { godwokenUrl } from "../url";
import { Hash } from "@ckb-lumos/base";

const polyjuiceConfig = Config.polyjuice;

export async function deploySimpleStorage(currentEthAddress: string) {
  console.log("Deploy SimpleStorage");

  const prefix = "#deploy-";

  fillSelectOptions("#deploy-sudt-id", polyjuiceConfig.sudt_ids);
  const createAccountIds: any = polyjuiceConfig.creator_account_ids;
  const createAccountIdsStr: string = Object.keys(createAccountIds)
    .map((key: string): string => {
      const value: number = createAccountIds[key];
      return `${value}(using ${key} token type)`;
    })
    .join(", ");
  document.querySelector<HTMLInputElement>(
    "#deploy-creator-account-id-info"
  )!.innerText = `Deployed example accounts: ${createAccountIdsStr}`;

  const getRequiredInputValue = createGetRequiredInputValue(prefix);
  const submitButton = async () => {
    const sudtId: string = getRequiredInputValue("sudt-id");
    const creatorAccountId: string = getRequiredInputValue(
      "creator-account-id"
    );
    const fromId = await getAccountIdByEthAddress(currentEthAddress);
    if (fromId === undefined || fromId === null) {
      const message = "Please deposit to create a godwoken account first.";
      alert(message);
      throw new Error(message);
    }
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

    let deployResult: [RunResult, Hash, number] | undefined;
    try {
      deployResult = await deployContract(
        +sudtId,
        +creatorAccountId,
        fromId,
        BigInt(value),
        data
      );
    } catch (e) {
      alert(e.message);
      throw e;
    }

    const runResult: RunResult = deployResult![0];
    const deployedScriptHash = deployResult![1];
    const contractAccountId = deployResult![2];

    if (runResult !== null) {
      const errorMessage: string | undefined = (runResult as any).message;
      if (errorMessage !== undefined && errorMessage !== null) {
        alert(errorMessage);
      } else {
        alert(SUBMIT_SUCCESS_MESSAGE);
      }
    } else {
      alert(SUBMIT_SUCCESS_MESSAGE)
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

export async function simpleStorageSet(currentEthAddress: string) {
  console.log("SimpleStorage Set");

  fillSelectOptions("#ss-set-sudt-id", polyjuiceConfig.sudt_ids);
  document.querySelector<HTMLInputElement>(
    "#ss-set-to-id"
  )!.value = Config.polyjuice.simple_storage_account_id.toString();

  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  const prefix = "#ss-set-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitButton = async () => {
    const sudtId: string = getRequiredInputValue("sudt-id");
    const creatorAccountId: number = 0;
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

    const [runResult] = await submitL2Transaction(
      +sudtId,
      +creatorAccountId,
      fromId,
      +toId,
      BigInt(value),
      data
    );

    const message = (runResult as any).message;
    if (message !== undefined && message !== null) {
      alert(message);
    } else {
      alert(SUBMIT_SUCCESS_MESSAGE);
    }
  };

  const button = document.querySelector<HTMLElement>("#ss-set-submit");
  if (button) {
    button.onclick = submitButton;
  }
}

export async function simpleStorageGet(currentEthAddress: string) {
  console.log("SimpleStorage Set");

  fillSelectOptions("#ss-get-sudt-id", polyjuiceConfig.sudt_ids);
  document.querySelector<HTMLInputElement>(
    "#ss-get-to-id"
  )!.value = Config.polyjuice.simple_storage_account_id.toString();

  const currentAccountID = await getAccountIdByEthAddress(currentEthAddress);

  const prefix = "#ss-get-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitButton = async () => {
    const sudtId: string = getRequiredInputValue("sudt-id");
    const creatorAccountId: number = 0;
    const fromId = currentAccountID;
    const toId = getRequiredInputValue("to-id");
    const value: bigint = BigInt(0);
    const data: string = SimpleStorage.getValue();

    console.log("SimpleStorage Get Parmas:", {
      sudt_id: +sudtId,
      creator_account_id: creatorAccountId,
      from_id: fromId,
      to_id: +toId,
      value: value,
      data: data,
    });

    const runResult = await executeL2Transaction(
      +sudtId,
      creatorAccountId,
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
