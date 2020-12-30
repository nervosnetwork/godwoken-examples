import { Script, CellDep } from "@ckb-lumos/base";
import runnerConfig from "../../configs/runner_config.json";
import { DeploymentConfig } from "../base";

const config = runnerConfig.deploymentConfig;
export const deploymentConfig: DeploymentConfig = {
  deposition_lock: config.deposition_lock as Script,
  custodian_lock: config.custodian_lock as Script,
  state_validator_lock: config.state_validator_lock as Script,
  state_validator_type: config.state_validator_type as Script,

  deposition_lock_dep: config.deposition_lock_dep as CellDep,
  custodian_lock_dep: config.custodian_lock_dep as CellDep,
  state_validator_lock_dep: config.state_validator_lock_dep as CellDep,
  state_validator_type_dep: config.state_validator_type_dep as CellDep,
};
