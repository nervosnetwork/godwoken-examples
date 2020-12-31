import PWCore from "@lay2/pw-core";
import { Script, HexString } from "@ckb-lumos/base";
import { DeploymentConfig } from "../base";
export declare function send(pwcore: PWCore, targetLock: Script, amount: string, feeRate?: number): Promise<HexString>;
export declare function sendSudt(pwcore: PWCore, targetLock: Script, amount: string, sudtScriptArgs: HexString, feeRate?: number): Promise<HexString>;
export declare function sendTx(pwcore: PWCore, deploymentConfig: DeploymentConfig, amount: string, layer2LockArgs?: HexString): Promise<string>;
export declare function sendSudtTx(pwcore: PWCore, deploymentConfig: DeploymentConfig, amount: string, sudtScriptArgs: HexString, layer2LockArgs?: HexString): Promise<HexString>;
