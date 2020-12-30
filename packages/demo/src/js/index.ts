import PWCore, { EthProvider, PwCollector } from "@lay2/pw-core";
import { getCurrentEthAccount } from "./utils/eth_account";
import { ckbUrl, pwCollectorUrl } from "./url";
import { displayBalance } from "./pages/balance";
import { displayEthAddress } from "./pages/display_eth_address";
import { depositCKB, depositSudt } from "./pages/deposit";
import {
  deploySimpleStorage,
  simpleStorageGet,
  simpleStorageSet,
} from "./pages/polyjuice";
import { godwokenQuerySudt } from "./pages/query_sudt";
import { godwokenSudtTransfer } from "./pages/sudt_transfer";
import { godwokenWithdraw } from "./pages/withdraw";

export async function initPWCore() {
  const pwcore = await new PWCore(ckbUrl).init(
    new EthProvider(),
    new PwCollector(pwCollectorUrl)
  );
  return pwcore;
}

async function withPw(currentEthAddress: string) {
  const pwcore = await initPWCore();

  depositCKB(pwcore, currentEthAddress);
  depositSudt(pwcore, currentEthAddress);
}

async function main() {
  const currentEthAddress: string = await getCurrentEthAccount();
  console.log("current eth address:", currentEthAddress);
  displayEthAddress(currentEthAddress);

  withPw(currentEthAddress);

  displayBalance(currentEthAddress);

  // SimpleStorage
  deploySimpleStorage(currentEthAddress);
  simpleStorageGet(currentEthAddress);
  simpleStorageSet(currentEthAddress);

  godwokenQuerySudt(currentEthAddress);
  godwokenSudtTransfer(currentEthAddress);
  godwokenWithdraw(currentEthAddress);
}

main();
