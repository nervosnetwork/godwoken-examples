import { HexString } from "@ckb-lumos/base";
import PWCore from "@lay2/pw-core";
import { sendSudtTx, sendTx } from "../operations/deposition";
import { deploymentConfig } from "../utils/deployment_config";
import {
  createGetRequiredInputValue,
  fillSelectOptions,
  SUBMIT_SUCCESS_MESSAGE,
} from "./helpers";
import Config from "../../configs/config.json";

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

export function initDepositSudtPage() {
  // const sudtIds = JSON.parse(
  //   JSON.stringify(Config.godwoken.sudt_script_hashes)
  // )
  // for(const key in sudtIds) {
  //   if(sudtIds[key] === "0x" + "0".repeat(64)) {
  //       delete sudtIds[key];
  //   }
  // }
  // fillSelectOptions("#deposit-sudt-script-args", sudtIds);
}

export async function depositSudt(pwcore: PWCore, ethAddress: string) {
  const prefix = "#deposit-sudt-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitAmountButton = async () => {
    const amount: string = getRequiredInputValue("amount");
    const scriptArgs: HexString =
      "0xb9bd13d1714ce30c30aff25565e062fb2e94fac8c3e907494ad3108a1e92a4eb";
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
