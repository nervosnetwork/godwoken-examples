import { Script, CellDep } from "@ckb-lumos/base";
import deployResult from "../../configs/scripts-deploy-result.json";
import { DeploymentConfig } from "../base";

const config = deployResult;
export const deploymentConfig: DeploymentConfig = {
  custodian_lock: buildScriptFromCodeHash(config.custodian_lock.script_type_hash),
  deposition_lock: buildScriptFromCodeHash(config.deposition_lock.script_type_hash),
  withdrawal_lock: buildScriptFromCodeHash(config.withdrawal_lock.script_type_hash),
  challenge_lock: buildScriptFromCodeHash(config.challenge_lock.script_type_hash),
  stake_lock: buildScriptFromCodeHash(config.stake_lock.script_type_hash),
  state_validator: buildScriptFromCodeHash(config.state_validator.script_type_hash),
  meta_contract_validator: buildScriptFromCodeHash(config.meta_contract_validator.script_type_hash),
  l2_sudt_validator: buildScriptFromCodeHash(config.l2_sudt_validator.script_type_hash),
  eth_account_lock: buildScriptFromCodeHash(config.eth_account_lock.script_type_hash),
  polyjuice_validator: buildScriptFromCodeHash(config.polyjuice_validator.script_type_hash),
  state_validator_lock: buildScriptFromCodeHash(config.state_validator_lock.script_type_hash),
  poa_state: buildScriptFromCodeHash(config.poa_state.script_type_hash),
  
  deposition_lock_dep: config.deposition_lock.cell_dep as CellDep,
  custodian_lock_dep: config.custodian_lock.cell_dep as CellDep,
  withdrawal_lock_dep: config.withdrawal_lock.cell_dep as CellDep,
  challenge_lock_dep: config.challenge_lock.cell_dep as CellDep,
  stake_lock_dep: config.stake_lock.cell_dep as CellDep,
  state_validator_dep: config.state_validator.cell_dep as CellDep,
  meta_contract_validator_dep: config.meta_contract_validator.cell_dep as CellDep, 
  l2_sudt_validator_dep: config.l2_sudt_validator.cell_dep as CellDep,
  eth_account_lock_dep: config.eth_account_lock.cell_dep as CellDep,
  polyjuice_validator_dep: config.polyjuice_validator.cell_dep as CellDep,
  state_validator_lock_dep: config.state_validator.cell_dep as CellDep,
  poa_state_dep: config.poa_state.cell_dep as CellDep,

};

function buildScriptFromCodeHash(codeHash: string): Script {
    return {
        code_hash: codeHash,
        hash_type: "type",
        args: "0x",
    };
}
