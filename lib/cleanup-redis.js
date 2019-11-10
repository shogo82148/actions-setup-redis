"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const cleanup = __importStar(require("./cleanup"));
async function run() {
    try {
        cleanup.shutdownRedis(core.getState('REDIS_CLI'), core.getState('REDIS_PORT'));
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run();
