import { Godwoken } from "@godwoken-examples/godwoken";

export class LocalNonce {
  static nonce: number = 0;

  static async getNonce(id: number, godwoken: Godwoken): Promise<number> {
    const nonce = await godwoken.getNonce(id);

    if (LocalNonce.nonce < nonce) {
      LocalNonce.nonce = nonce;
    }

    return LocalNonce.nonce;
  }

  static increaseNonce() {
    LocalNonce.nonce += 1;
  }
}
