import { HexString } from "@ckb-lumos/base";
import PWCore from "@lay2/pw-core";
import { sendSudtTx, sendTx } from "../operations/deposition";
import { deploymentConfig } from "../utils/deployment_config";
import { createGetRequiredInputValue, SUBMIT_SUCCESS_MESSAGE } from "./helpers";

export async function depositCKB(pwcore: PWCore, currentEthAddress: string) {
  console.log("depositCKB");
  const prefix = "";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitAmountButton = async () => {
    const amount: string = getRequiredInputValue("#amount");
    try {
      const txHash = await sendTx(
        pwcore,
        deploymentConfig,
        amount,
        currentEthAddress.toLowerCase()
      );
      alert(`Deposit in tx hash: ${txHash}. ${SUBMIT_SUCCESS_MESSAGE}`);
    } catch (e) {
      alert(e.message);
    }
  };

  document.querySelector<HTMLElement>(
    "#submit-amount"
  )!.onclick = submitAmountButton;
}

export async function depositSudt(pwcore: PWCore, ethAddress: string) {
  const prefix = "#deposit-sudt-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitAmountButton = async () => {
    const amount: string = getRequiredInputValue("amount");
    const scriptArgs: HexString = getRequiredInputValue("script-args");
    try {
      const txHash = await sendSudtTx(
        pwcore,
        deploymentConfig,
        amount,
        scriptArgs,
        ethAddress.toLowerCase()
      );

      alert(`Deposit in tx hash: ${txHash}. ${SUBMIT_SUCCESS_MESSAGE}`);
    } catch (e) {
      alert(e.message);
    }
  };

  document.querySelector<HTMLElement>(
    "#deposit-sudt-submit"
  )!.onclick = submitAmountButton;
}
