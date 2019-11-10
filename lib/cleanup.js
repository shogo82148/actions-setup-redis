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
const exec = __importStar(require("@actions/exec"));
async function shutdownRedis(cli, port) {
    if (cli === '' || port === '') {
        return; // no need to shutdown redis-server
    }
    core.debug('shutdown redis-server');
    await exec.exec(cli, ['-h', '127.0.0.1', '-p', port, 'shutdown']);
}
exports.shutdownRedis = shutdownRedis;
