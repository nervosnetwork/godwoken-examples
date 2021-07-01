import { HexString, utils } from "@ckb-lumos/base";
import { sudt } from "@ckb-lumos/common-scripts";
import { Address } from "@ckb-lumos/base";
import { generateAddress, parseAddress } from "@ckb-lumos/helpers";
import { key } from "@ckb-lumos/hd";
import { getConfig } from "@ckb-lumos/config-manager";
import crypto from "crypto";
import keccak256 from "keccak256";

export function privateKeyToCkbAddress(privateKey: HexString): Address {
  const publicKey = key.privateToPublic(privateKey);
  const publicKeyHash = key.publicKeyToBlake160(publicKey);
  const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
  const script = {
    code_hash: scriptConfig.CODE_HASH,
    hash_type: scriptConfig.HASH_TYPE,
    args: publicKeyHash,
  };
  const address = generateAddress(script);
  return address;
}

export function privateKeyToEthAddress(privateKey: HexString) {
  const ecdh = crypto.createECDH(`secp256k1`);
  ecdh.generateKeys();
  ecdh.setPrivateKey(Buffer.from(privateKey.slice(2), "hex"));
  const publicKey: string = "0x" + ecdh.getPublicKey("hex", "uncompressed");
  const ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return ethAddress;
}

export function ckbAddressToLockHash(address: Address): HexString {
  const lock = parseAddress(address);
  const lockHash = utils.computeScriptHash(lock);
  return lockHash;
}

export async function asyncSleep(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getSudtScriptArgs(privateKey: HexString) {
  const address: Address = privateKeyToCkbAddress(privateKey);
  const sudtScriptArgs: HexString = sudt.ownerForSudt(address);
  console.log("sudt script args:", sudtScriptArgs);
}
