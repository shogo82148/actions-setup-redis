"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const path = __importStar(require("path"));
const starter = __importStar(require("./starter"));
const fs_1 = require("fs");
async function run() {
    if (process.env["TEST_RUNNER_TOOL_CACHE"]) {
        process.env["RUNNER_TOOL_CACHE"] = process.env["TEST_RUNNER_TOOL_CACHE"];
    }
    try {
        const required = { required: true };
        const distribution = core.getInput("distribution", required);
        const version = core.getInput("redis-version", required);
        const port = parseInt(core.getInput("redis-port", required));
        const tlsPort = parseInt(core.getInput("redis-tls-port", required));
        const autoStart = core.getBooleanInput("auto-start", required);
        const configure = core.getInput("redis-conf");
        const redisPath = await core.group("install redis", async () => {
            return await installer.getRedis(distribution, version);
        });
        if (autoStart) {
            await core.group("start redis", async () => {
                const tempDir = process.env["RUNNER_TEMP"] || "/tmp";
                const confPath = await fs_1.promises.mkdtemp(tempDir + path.sep);
                await starter.startRedis({
                    confPath,
                    redisPath,
                    port,
                    tlsPort,
                    configure,
                });
            });
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error);
        }
        else {
            core.setFailed(`${error}`);
        }
    }
}
void run();
