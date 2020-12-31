import { Godwoken } from "@godwoken-examples/godwoken";
export declare class LocalNonce {
    static nonce: number;
    static getNonce(id: number, godwoken: Godwoken): Promise<number>;
    static increaseNonce(): void;
}
