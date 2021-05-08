import {
  createGetRequiredInputValue,
  fillSelectOptions,
  SUBMIT_SUCCESS_MESSAGE,
} from "./helpers";
import Config from "../../configs/config.json";
import { getAccountIdByEthAddress, getLayer2LockHash } from "../polyjuice";
import { Hash, utils } from "@ckb-lumos/base";
import { Amount, AmountUnit, LumosConfigs, parseAddress } from "@lay2/pw-core";
import { withdraw } from "../godwoken";

export async function godwokenWithdraw(currentEthAddress: string) {
  console.log("godwokenWithdraw");

  fillSelectOptions(
    "#withdrawal-sudt-script-hash",
    Config.godwoken.sudt_script_hashes
  );

  const prefix = "#withdrawal-";
  const getRequiredInputValue = createGetRequiredInputValue(prefix);

  const submitButton = async () => {
    const fromId = await getAccountIdByEthAddress(currentEthAddress);
    if (fromId === undefined || fromId === null) {
      const message = `Account id not found by address: ${currentEthAddress}`;
      alert(message);
      throw new Error(message);
    }
    const c: string = getRequiredInputValue("capacity");
    const capacity: bigint = BigInt(
      new Amount(c, AmountUnit.ckb).toString(AmountUnit.shannon)
    );
    const amount: bigint = BigInt(getRequiredInputValue("amount"));
    const sudtScriptHash: Hash = getRequiredInputValue("sudt-script-hash");
    const l2LockHash: Hash = getLayer2LockHash(currentEthAddress);

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
      const result = await withdraw(
        fromId,
        capacity,
        amount,
        sudtScriptHash,
        l2LockHash,
        ownerLockHash
      );

      if (result !== null) {
        const message = (result as any).message;
        if (message !== undefined && message !== null) {
          alert(message);
        } else {
          alert(SUBMIT_SUCCESS_MESSAGE);
        }
      } else {
        alert(SUBMIT_SUCCESS_MESSAGE);
      }
    } catch (e) {
      alert(e.message);
      throw e;
    }
  };

  const button = document.querySelector<HTMLElement>("#withdrawal-submit");
  if (button) {
    button.onclick = submitButton;
  }
}
