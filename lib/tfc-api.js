"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTFCOutput = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * Fetches a given output variable's value from the latest remote state file from Terraform Cloud.
 *
 * @param apiToken Terraform API token.
 * @param workspaceId ID of Terraform Cloud workspace (starts with `ws-`).
 * @param variableName Output variable name.
 */
function getTFCOutput(apiToken, workspaceId, variableName) {
    return __awaiter(this, void 0, void 0, function* () {
        const apiEndpoint = `https://app.terraform.io/api/v2/workspaces/${workspaceId}/current-state-version?include=outputs`;
        const response = yield (0, node_fetch_1.default)(apiEndpoint, {
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Authorization: `Bearer ${apiToken}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Terraform Cloud API returned an error response with code ${response.status}`);
        }
        const data = (yield response.json());
        const matchingOutput = data.included.find((a) => a.attributes.name === variableName);
        if (!matchingOutput) {
            throw new Error(`Variable ${variableName} not found in ${data.included.length} outputs retrieved from Terraform Cloud!`);
        }
        return matchingOutput.attributes;
    });
}
exports.getTFCOutput = getTFCOutput;
