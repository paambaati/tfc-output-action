# tfc-output-action

[![Test Coverage](https://api.codeclimate.com/v1/badges/4eb8c0c93ff2e68baacc/test_coverage)](https://codeclimate.com/github/paambaati/tfc-output-action/test_coverage)
[![Build Status](https://github.com/paambaati/tfc-output-action/workflows/PR%20checks/badge.svg)](https://actions-badge.atrox.dev/paambaati/tfc-output-action/goto)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A GitHub action that fetches [Terraform Output](https://www.terraform.io/language/values/outputs) values from [Terraform Cloud](https://www.terraform.io/cloud-docs) remote state. Additionally, it [securely handles sensitive output](#sensitive-output).

## Why?

This is useful when you've provisioned your infrastructure using Terraform and would like to access some values –

1. In one stack from another stack.
2. In other workflows or projects (backend deployments, codegen scripts, etc.) that need access to values from Terraform.

With this workflow, you do not need to hardcode values from Terraform ever.

## Usage

This action requires that you have a Terraform Cloud account and an API token. Learn how to get one in the official documentation – https://www.terraform.io/cloud-docs/users-teams-organizations/api-tokens

### Inputs

| Input               | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `apiToken`          | API token from Terraform Cloud.                                   |
| `workspaceId`       | Terraform Cloud workspace ID.                                     |
| `variableName`      | Name of the Terraform Cloud output variable you want to retrieve. |

#### Example

Assuming you have a [Terraform Output](https://www.terraform.io/language/values/outputs) variable called `iam-user-name`, here's how you'd access it in a workflow.

```yaml
steps:
  - name: Fetch remote value from Terraform
    uses: paambaati/tfc-output-action@v1.0.4
    id: tfc-output
    with:
      apiToken: ${{ secrets.TF_API_TOKEN }}
      workspaceId: ws-PK3vmEp8KNcqekcu
      variableName: 'iam-user-name'

  - name: Print the value
    run: echo "IAM user name is ${{ steps.tfc-output.outputs.value }}"
``` 
## Sensitive Output

If your Terraform Output is marked as [`sensitive`](https://www.terraform.io/language/values/outputs#sensitive-suppressing-values-in-cli-output), the output value from this action is also masked, and so it is not exposed in workflow logs.
