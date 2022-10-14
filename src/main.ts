import {
  debug,
  error,
  getInput,
  setFailed,
  setOutput,
  setSecret,
} from '@actions/core';
import { getTFCOutput } from './tfc-api';

export function run(
  apiToken: string,
  workspaceId: string,
  variableName: string
): Promise<void> {
  const OUTPUT_NAME = 'value' as const;
  return new Promise(async (resolve, reject) => {
    if (!workspaceId.startsWith('ws-')) {
      const err = new Error(
        "Terraform Cloud workspace ID looks invalid; it must start with 'ws-'"
      );
      error(err.message);
      setFailed(err.message);
      return reject(err);
    }

    try {
      debug(
        `ℹ️ Fetching state output from Terraform Cloud API for workspace ID ${workspaceId} and variable name ${variableName} ...`
      );
      const output = await getTFCOutput(apiToken, workspaceId, variableName);
      if (output.sensitive) setSecret(OUTPUT_NAME);
      setOutput(OUTPUT_NAME, output.value);
      debug('✅ Output variable found!');
      return resolve();
    } catch (err) {
      error((err as Error).message);
      setFailed('🚨 Fetching output variable from Terraform Cloud API failed!');
      return reject(err);
    }
  });
}

/* istanbul ignore next */
if (require.main === module) {
  const apiToken = getInput('apiToken', {
    required: true,
    trimWhitespace: true,
  });
  const workspaceId = getInput('workspaceId', {
    required: true,
    trimWhitespace: true,
  });
  const variableName = getInput('variableName', {
    required: true,
    trimWhitespace: true,
  });
  run(apiToken, workspaceId, variableName);
}
