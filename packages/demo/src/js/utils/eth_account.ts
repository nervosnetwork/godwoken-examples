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
