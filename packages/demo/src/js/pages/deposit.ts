import { HexString } from "@ckb-lumos/base";
import PWCore from "@lay2/pw-core";
import { sendSudtTx, sendTx } from "../operations/deposition";
import { deploymentConfig } from "../utils/deployment_config";
import { createGetRequiredInputValue } from "./helpers";

export async function depositCKB(pwcore: PWCore, currentEthAddress: string) {
  const prefix = "";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitAmountButton = async () => {
    const amount: string = getRequiredInputValue("#amount");
    await sendTx(
      pwcore,
      deploymentConfig,
      amount,
      currentEthAddress.toLowerCase()
    );
  };

  const button = document.querySelector<HTMLElement>("#submit-amount");
  if (button) {
    button.onclick = submitAmountButton;
  }
}

export async function depositSudt(pwcore: PWCore, ethAddress: string) {
  const prefix = "#deposit-sudt-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitAmountButton = async () => {
    const amount: string = getRequiredInputValue("amount");
    const scriptArgs: HexString = getRequiredInputValue("script-args");
    await sendSudtTx(
      pwcore,
      deploymentConfig,
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
