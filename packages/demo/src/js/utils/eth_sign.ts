import { HexString } from "@ckb-lumos/base";
import { getCurrentEthAccount } from "./eth_account";

export async function sign(message: HexString): Promise<HexString> {
  const web3: any = (window as any).web3;

  const account: string = await getCurrentEthAccount();

  console.log("SIGN using account:", account);

  return new Promise((resolve, reject) => {
    const from = account;
    const params = [message, from];
    const method = "personal_sign";

    web3.currentProvider.sendAsync(
      { method, params, from },
      (err: any, result: any) => {
        if (err) {
          reject(err);
        }
        if (result.error) {
          reject(result.error);
        }
        result = result.result;
        console.log("PERSONAL SIGNED:", result);

        // TODO: maybe not needed when sign
        let v = Number.parseInt(result.slice(-2), 16);
        if (v >= 27) v -= 27;
        result = result.slice(0, -2) + v.toString(16).padStart(2, "0");
        console.log("PERSONAL SIGNED FINAL:", result);

        resolve(result);
      }
    );
  });
}
