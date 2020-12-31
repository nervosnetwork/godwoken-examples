import { CellDep, Script } from "@ckb-lumos/base";
export interface DeploymentConfig {
    deposition_lock: Script;
    custodian_lock: Script;
    state_validator_lock: Script;
    state_validator_type: Script;
    deposition_lock_dep: CellDep;
    custodian_lock_dep: CellDep;
    state_validator_lock_dep: CellDep;
    state_validator_type_dep: CellDep;
}
