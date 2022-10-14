import fetch from 'node-fetch';

interface TerraformCloudAPIStateVersionOutputAttribute {
  name: string;
  sensitive: true;
  type: 'string' | 'array' | 'number' | 'bool';
  value: string | boolean | number | Array<string>;
  'detailed-type': unknown;
}

interface TerraformCloudAPIStateVersionResponse {
  data: {
    id: string;
    type: 'state-versions';
    attributes: Record<string, unknown>;
    relationships: Record<string, unknown>;
    links: {
      self: string;
    };
  };
  included: Array<{
    id: string;
    type: 'state-version-outputs';
    attributes: TerraformCloudAPIStateVersionOutputAttribute;
  }>;
}

/**
 * Fetches a given output variable's value from the latest remote state file from Terraform Cloud.
 *
 * @param apiToken Terraform API token.
 * @param workspaceId ID of Terraform Cloud workspace (starts with `ws-`).
 * @param variableName Output variable name.
 */
export async function getTFCOutput(
  apiToken: string,
  workspaceId: string,
  variableName: string
): Promise<TerraformCloudAPIStateVersionOutputAttribute> {
  const apiEndpoint = `https://app.terraform.io/api/v2/workspaces/${workspaceId}/current-state-version?include=outputs`;
  const response = await fetch(apiEndpoint, {
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Terraform Cloud API returned an error response with code ${response.status}`
    );
  }

  const data = (await response.json()) as TerraformCloudAPIStateVersionResponse;
  const matchingOutput = data.included.find(
    (a) => a.attributes.name === variableName
  );
  if (!matchingOutput) {
    throw new Error(
      `Variable ${variableName} not found in ${data.included.length} outputs retrieved from Terraform Cloud!`
    );
  }
  return matchingOutput.attributes;
}
