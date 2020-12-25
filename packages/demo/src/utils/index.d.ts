import * as core from "./core";
export { core };

import { Reader } from "ckb-js-toolkit";
import { Hash, HexString, Script } from "@ckb-lumos/base";

declare class CKBHasher {
  update(data: string | Reader | ArrayBuffer): this;

  digestReader(): Reader;

  digestHex(): Hash;
}

export declare const utils: {
  CKBHasher: typeof CKBHasher;

  ckbHash(buffer: ArrayBuffer): Reader;

  /**
   * convert bigint to BigUInt64 little-endian hex string
   *
   * @param num
   */
  toBigUInt64LE(num: bigint): HexString;

  /**
   * convert BigUInt64 little-endian hex string to bigint
   *
   * @param hex BigUInt64 little-endian hex string
   */
  readBigUInt64LE(hex: HexString): bigint;

  /**
   * convert bigint to BigUInt128 little-endian hex string
   *
   * @param u128
   */
  toBigUInt128LE(u128: bigint): string;

  /**
   * convert BigUInt64 little-endian hex string to bigint
   *
   * @param leHex BigUInt128 little-endian hex string
   */
  readBigUInt128LE(leHex: HexString): bigint;

  /**
   * compute lock/type hash
   *
   * @param script
   * @param options
   */
  computeScriptHash(script: Script, options?: { validate?: boolean }): Hash;

  assertHexString(debugPath: string, str: string): void;

  assertHexadecimal(debugPath: string, str: string): void;
};
