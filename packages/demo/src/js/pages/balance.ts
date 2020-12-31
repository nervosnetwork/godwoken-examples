import { getBalanceByEthAddress } from "../polyjuice";
import { createGetRequiredInputValue, fillSelectOptions } from "./helpers";
import Config from "../../configs/config.json";

const polyjuiceConfig = Config.polyjuice;

export async function displayBalance(currentEthAddress: string) {
  const prefix = "#balance-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  fillSelectOptions(`#balance-sudt-id`, polyjuiceConfig.sudt_ids);

  const submitButton = async () => {
    const sudtId: string = getRequiredInputValue("sudt-id");
    console.log("sudt id:", sudtId);

    const balanceElement = document.querySelector<HTMLElement>(
      "#balance-value"
    )!;
    try {
      const balance: bigint = await getBalanceByEthAddress(
        +sudtId,
        currentEthAddress
      );
      console.log("get balance:", balance);
      balanceElement.innerHTML = `${balance} shannons`;
    } catch (e) {
      balanceElement.innerHTML = "Not Created.";
      alert(e.message);
    }
  };

  const button = document.querySelector<HTMLElement>("#balance-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
