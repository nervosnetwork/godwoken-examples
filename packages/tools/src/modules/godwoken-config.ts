import { Hash } from "@ckb-lumos/base";
import godwokenConfig from "../configs/godwoken-config.json";

export const VALIDATOR_SCRIPT_TYPE_HASH: Hash =
  godwokenConfig.backends[2].validator_script_type_hash;
export const ROLLUP_TYPE_HASH: Hash = godwokenConfig.genesis.rollup_type_hash;
