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
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core_1 = require("@actions/core");
const tfc_api_1 = require("./tfc-api");
function run(apiToken, workspaceId, variableName) {
    const OUTPUT_NAME = 'value';
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        if (!workspaceId.startsWith('ws-')) {
            const err = new Error("Terraform Cloud workspace ID looks invalid; it must start with 'ws-'");
            (0, core_1.error)(err.message);
            (0, core_1.setFailed)(err.message);
            return reject(err);
        }
        try {
            (0, core_1.debug)(`ℹ️ Fetching state output from Terraform Cloud API for workspace ID ${workspaceId} and variable name ${variableName} ...`);
            const output = yield (0, tfc_api_1.getTFCOutput)(apiToken, workspaceId, variableName);
            if (output.sensitive)
                (0, core_1.setSecret)(OUTPUT_NAME);
            (0, core_1.setOutput)(OUTPUT_NAME, output.value);
            (0, core_1.debug)('✅ Output variable found!');
            return resolve();
        }
        catch (err) {
            (0, core_1.error)(err.message);
            (0, core_1.setFailed)('🚨 Fetching output variable from Terraform Cloud API failed!');
            return reject(err);
        }
    }));
}
exports.run = run;
/* istanbul ignore next */
if (require.main === module) {
    const apiToken = (0, core_1.getInput)('apiToken', {
        required: true,
        trimWhitespace: true,
    });
    const workspaceId = (0, core_1.getInput)('workspaceId', {
        required: true,
        trimWhitespace: true,
    });
    const variableName = (0, core_1.getInput)('variableName', {
        required: true,
        trimWhitespace: true,
    });
    run(apiToken, workspaceId, variableName);
}
