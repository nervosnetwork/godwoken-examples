import { CellDep, Script } from "@ckb-lumos/base";

export interface DeploymentConfig {
  custodian_lock: Script;
  deposition_lock: Script;
  withdrawal_lock: Script;
  challenge_lock: Script;
  stake_lock: Script;
  state_validator: Script;
  meta_contract_validator: Script;
  l2_sudt_validator: Script;
  eth_account_lock: Script;
  polyjuice_validator: Script;
  state_validator_lock: Script;
  poa_state: Script;

  custodian_lock_dep: CellDep;
  deposition_lock_dep: CellDep;
  withdrawal_lock_dep: CellDep;
  challenge_lock_dep: CellDep;
  stake_lock_dep: CellDep;
  state_validator_dep: CellDep;
  meta_contract_validator_dep: CellDep;
  l2_sudt_validator_dep: CellDep;
  eth_account_lock_dep: CellDep;
  polyjuice_validator_dep: CellDep;
  state_validator_lock_dep: CellDep;
  poa_state_dep: CellDep;
}
