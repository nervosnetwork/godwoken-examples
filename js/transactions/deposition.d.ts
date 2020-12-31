import { DeploymentConfig } from "../base";
import { Script, HexString, Hash, PackedSince } from "@ckb-lumos/base";
export interface DepositionLockArgs {
    owner_lock_hash: Hash;
    layer2_lock: Script;
    cancel_timeout: PackedSince;
}
export declare function serializeArgs(args: DepositionLockArgs): HexString;
export declare function generateDepositionLock(config: DeploymentConfig, args: HexString): Script;
export declare function getDepositionLockArgs(ownerLockHash: Hash, layer2_lock_args: HexString, cancelTimeout?: PackedSince): DepositionLockArgs;
export declare function getRollupTypeHash(): HexString;
