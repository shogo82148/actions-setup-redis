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
exports.startRedis = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
async function startRedis(confPath, redisPath, port, configure) {
    await io.mkdirP(confPath);
    const pid = path.join(confPath, 'redis.pid');
    const log = path.join(confPath, 'redis.log');
    const conf = path.join(confPath, 'redis.conf');
    // XXX: In some systems, the length of unix domain socket path may limit 92 bytes.
    // so the shorter the file name, the better.
    // https://man7.org/linux/man-pages/man7/unix.7.html
    const sock = path.join(confPath, 's');
    core.saveState('REDIS_UNIX_SOCKET', sock);
    core.saveState('REDIS_CONF_DIR', confPath);
    core.setOutput('redis-unix-socket', sock);
    core.setOutput('redis-port', port.toString());
    // generate the configure file
    const confContents = `
daemonize yes
pidfile ${pid}
port ${port}
bind 127.0.0.1
unixsocket ${sock}
unixsocketperm 700
logfile ${log}
${configure}
`;
    await fs_1.promises.writeFile(conf, confContents);
    core.info('starting redis-server');
    const server = path.join(redisPath, 'redis-server');
    await exec.exec(server, [conf]);
    core.info('wait for redis-server to become ready');
    const cli = path.join(redisPath, 'redis-cli');
    const option = {
        ignoreReturnCode: true
    };
    for (let i = 0;; i++) {
        const exitCode = await exec.exec(cli, ['-s', sock, 'ping'], option);
        core.debug(`ping exits with ${exitCode}`);
        if (exitCode === 0) {
            return;
        }
        if (i >= 10) {
            core.debug('give up');
            break;
        }
        core.debug('wait a little');
        await sleep(1);
    }
    // launch failed, show the log
    const logContents = await fs_1.promises.readFile(log);
    core.info('redis-server log:');
    core.info(logContents.toString());
    throw new Error('fail to launch redis-server');
}
exports.startRedis = startRedis;
function sleep(waitSec) {
    return new Promise(function (resolve) {
        setTimeout(() => resolve(), waitSec * 1000);
    });
}
