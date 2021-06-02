"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const installer = __importStar(require("./installer"));
const starter = __importStar(require("./starter"));
async function run() {
    try {
        const required = { required: true };
        const version = core.getInput('redis-version', required);
        const port = parseInt(core.getInput('redis-port', required));
        const autoStart = core.getBooleanInput('auto-start', required);
        const redisPath = await core.group('install redis', async () => {
            return installer.getRedis(version);
        });
        if (autoStart) {
            core.group('start redis', async () => {
                const confDir = process.env['RUNNER_TEMP'] || '/tmp';
                await starter.startRedis(confDir, redisPath, port);
            });
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
