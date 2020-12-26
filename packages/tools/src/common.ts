
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { argv, exit } from "process";

import { Reader } from "ckb-js-toolkit";
import { Command } from "commander";
import { Script, utils } from "@ckb-lumos/base";
import { scriptToAddress } from "@ckb-lumos/helpers";
import { getConfig, initializeConfig } from "@ckb-lumos/config-manager";
import {
    Godwoken,
    GodwokenUtils,
    L2Transaction,
    RawL2Transaction,
    RawWithdrawalRequest,
    WithdrawalRequest,
    CreateAccount,
    UInt32LEToNumber,
    u32ToHex,
} from "@godwoken-examples/godwoken";
import * as secp256k1 from "secp256k1";

export function _signMessage(message: string, privkey: string) {
    const signObject = secp256k1.ecdsaSign(
        new Uint8Array(new Reader(message).toArrayBuffer()),
        new Uint8Array(new Reader(privkey).toArrayBuffer())
    );
    const signatureBuffer = new ArrayBuffer(65);
    const signatureArray = new Uint8Array(signatureBuffer);
    signatureArray.set(signObject.signature, 0);
    signatureArray.set([signObject.recid], 64);
    return new Reader(signatureBuffer).serializeJson();
}

export function _generateTransactionMessageToSign(
    raw_l2tx: RawL2Transaction,
    rollup_type_hash: string,
) {
    console.log("RawL2Transaction", raw_l2tx);
    const godwoken_utils = new GodwokenUtils(rollup_type_hash);
    return godwoken_utils.generateTransactionMessageToSign(raw_l2tx);
}

export function ckbAddress(privateKey: any) {
    initializeConfig();
    const privateKeyBuffer = new Reader(privateKey).toArrayBuffer();
    const publicKeyArray = secp256k1.publicKeyCreate(
        new Uint8Array(privateKeyBuffer)
    );
    const publicKeyHash = utils
        .ckbHash(publicKeyArray.buffer)
        .serializeJson()
        .substr(0, 42);
    const scriptConfig = getConfig().SCRIPTS.SECP256K1_BLAKE160!;
    const script = {
        code_hash: scriptConfig.CODE_HASH,
        hash_type: scriptConfig.HASH_TYPE,
        args: publicKeyHash,
    };
    return scriptToAddress(script);
}
