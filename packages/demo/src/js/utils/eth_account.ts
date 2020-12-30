export async function getEthAccounts(): Promise<string[]> {
  const accounts = (await (window as any).ethereum.send("eth_requestAccounts"))
    .result;

  return accounts;
}

export async function getCurrentEthAccount(): Promise<string> {
  const accounts = await getEthAccounts();

  if (accounts.length === 0) {
    throw new Error("No metamask accounts found!");
  }

  return accounts[0];
}

let currentAddress: string | undefined;

export async function currentEthAddress(): Promise<string> {
  if (!currentAddress) {
    currentAddress = await getCurrentEthAccount();
  }
  return currentAddress;
}
