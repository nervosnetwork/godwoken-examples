import { Script, CellDep } from "@ckb-lumos/base";
import runnerConfig from "../../configs/runner_config.json";
import { DeploymentConfig } from "../base";

export function getDeploymentConfig(): DeploymentConfig {
  const deploymentConfig = runnerConfig.deploymentConfig;

  const config: DeploymentConfig = {
    deposition_lock: deploymentConfig.deposition_lock as Script,
    custodian_lock: deploymentConfig.custodian_lock as Script,
    state_validator_lock: deploymentConfig.state_validator_lock as Script,
    state_validator_type: deploymentConfig.state_validator_type as Script,

    deposition_lock_dep: deploymentConfig.deposition_lock_dep as CellDep,
    custodian_lock_dep: deploymentConfig.custodian_lock_dep as CellDep,
    state_validator_lock_dep: deploymentConfig.state_validator_lock_dep as CellDep,
    state_validator_type_dep: deploymentConfig.state_validator_type_dep as CellDep,
  };

  return config;
}
