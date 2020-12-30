import Config from "../../configs/config.json";
import { query } from "../godwoken";
import { getAccountIdByEthAddress } from "../polyjuice";
import { createGetRequiredInputValue, fillSelectOptions } from "./helpers";

const polyjuiceConfig = Config.polyjuice;

export async function godwokenQuerySudt(currentEthAddress: string) {
  console.log("godwokenQuerySudt");

  fillSelectOptions("#query-sudt-to-id", polyjuiceConfig.sudt_ids);

  document.querySelector<HTMLInputElement>(
    "#query-sudt-account-id-eth-address"
  )!.value = currentEthAddress;

  const prefix = "#query-sudt-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitButton = async () => {
    const fromId = await getAccountIdByEthAddress(currentEthAddress);
    if (fromId === undefined || fromId === null) {
      const message = `Account id not found by address: ${currentEthAddress}`;
      alert(message);
      throw new Error(message);
    }
    const toId: number = +getRequiredInputValue("to-id");
    const accountIdEthAddress: string = getRequiredInputValue(
      "account-id-eth-address"
    );
    const accountId: number = await getAccountIdByEthAddress(
      accountIdEthAddress
    );

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
