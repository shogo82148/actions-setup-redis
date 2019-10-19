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
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function startRedis(confPath, redisPath, port) {
    const baseDir = path.join(confPath, 'redis');
    await io.mkdirP(baseDir);
    const pid = path.join(baseDir, 'redis.pid');
    const log = path.join(baseDir, 'redis.log');
    const conf = path.join(baseDir, 'redis.conf');
    // generate the configure file
    const confContents = `
daemonize yes
pidfile ${pid}
port ${port}
bind 127.0.0.1
logfile ${log}
`;
    fs.writeFileSync(conf, confContents);
    core.debug('starting redis-server');
    const server = path.join(redisPath, 'redis-server');
    const exitCode = await exec.exec(server, [conf]);
    if (exitCode !== 0) {
        throw 'fail to launch redis-server';
    }
    core.debug('wait for redis-server to become ready');
    const cli = path.join(redisPath, 'redis-cli');
    for (let i = 0; i < 10; i++) {
        const exitCode = await exec.exec(cli, [
            '-h',
            '127.0.0.1',
            '-p',
            `${port}`,
            'ping'
        ]);
        core.debug(`ping exits with ${exitCode}`);
        if (exitCode === 0) {
            return;
        }
        await sleep(1);
    }
    throw 'fail to launch redis-server';
}
exports.startRedis = startRedis;
function sleep(waitSec) {
    return new Promise(function (resolve) {
        setTimeout(() => resolve(), waitSec);
    });
}
