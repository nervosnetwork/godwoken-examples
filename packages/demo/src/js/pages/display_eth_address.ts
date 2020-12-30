// display current eth address
export function displayEthAddress(address: string) {
  const currentEthAddressElement = document.querySelector<HTMLElement>(
    "#current-eth-address"
  );
  if (currentEthAddressElement) {
    currentEthAddressElement.innerHTML = address;
  }
}
