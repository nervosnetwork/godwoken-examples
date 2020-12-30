import {
  createGetRequiredInputValue,
  fillSelectOptions,
  SUBMIT_SUCCESS_MESSAGE,
} from "./helpers";
import Config from "../../configs/config.json";
import { getAccountIdByEthAddress } from "../polyjuice";
import { transfer } from "../godwoken";

const polyjuiceConfig = Config.polyjuice;

export async function godwokenSudtTransfer(currentEthAddress: string) {
  console.log("godwokenSudtTransfer");

  fillSelectOptions("#transfer-sudt-sudt-id", polyjuiceConfig.sudt_ids);

  const prefix = "#transfer-sudt-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitButton = async () => {
    const fromId = await getAccountIdByEthAddress(currentEthAddress);
    if (fromId === undefined || fromId === null) {
      const message = `Account id not found by address: ${currentEthAddress}`;
      alert(message);
      throw new Error(message);
    }
    const sudtId = +getRequiredInputValue("sudt-id");
    const toIdEthAddress = getRequiredInputValue("to-id-eth-address");
    const toId: number = await getAccountIdByEthAddress(toIdEthAddress);
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
      alert(SUBMIT_SUCCESS_MESSAGE);
    } catch (e) {
      alert(e.message);
      throw e;
    }
  };

  const button = document.querySelector<HTMLElement>("#transfer-sudt-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
