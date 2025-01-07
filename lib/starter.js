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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRedis = startRedis;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const fs_1 = require("fs");
async function startRedis(opts) {
    const { confPath, redisPath, port, tlsPort, configure } = opts;
    await io.mkdirP(confPath);
    const pid = path.join(confPath, "redis.pid");
    const log = path.join(confPath, "redis.log");
    const conf = path.join(confPath, "redis.conf");
    // XXX: In some systems, the length of unix domain socket path may limit 92 bytes.
    // so the shorter the file name, the better.
    // https://man7.org/linux/man-pages/man7/unix.7.html
    const sock = path.join(confPath, "s");
    core.saveState("REDIS_UNIX_SOCKET", sock);
    core.saveState("REDIS_CONF_DIR", confPath);
    core.setOutput("redis-unix-socket", sock);
    core.setOutput("redis-port", port.toString());
    core.setOutput("redis-tls-port", tlsPort.toString());
    const tlsConfigure = await generateTestCerts(confPath, tlsPort, redisPath);
    // generate the configure file
    const confContents = `
daemonize yes
pidfile ${pid}
port ${port}
bind 127.0.0.1
unixsocket ${sock}
unixsocketperm 700
logfile ${log}
${tlsConfigure}
${configure}
`;
    await fs_1.promises.writeFile(conf, confContents);
    core.info("starting redis-server");
    const server = path.join(redisPath, "redis-server");
    await exec.exec(server, [conf]);
    core.info("wait for redis-server to become ready");
    const cli = path.join(redisPath, "redis-cli");
    const option = {
        ignoreReturnCode: true,
    };
    for (let i = 0;; i++) {
        const exitCode = await exec.exec(cli, ["-s", sock, "ping"], option);
        core.debug(`ping exits with ${exitCode}`);
        if (exitCode === 0) {
            return;
        }
        if (i >= 10) {
            core.debug("give up");
            break;
        }
        core.debug("wait a little");
        await sleep(1);
    }
    // launch failed, show the log
    const logContents = await fs_1.promises.readFile(log);
    core.info("redis-server log:");
    core.info(logContents.toString());
    throw new Error("fail to launch redis-server");
}
// generate certificates and keys, and returns the configure for redis.conf.
// port of https://github.com/redis/redis/blob/763fd0941683eb64190daca6abab1f29a72a772e/utils/gen-test-certs.sh
async function generateTestCerts(confPath, tlsPort, redisPath) {
    if (tlsPort === 0) {
        // TLS is disabled.
        // skip TLS configuration.
        core.setOutput("redis-tls-dir", "");
        return "";
    }
    // search bundled openssl
    const openssl = path.join(redisPath, "openssl");
    if (!(await exists(openssl))) {
        // bundled openssl is not found, this version of redis might not support TLS.
        // skip TLS configuration.
        core.setOutput("redis-tls-dir", "");
        return "";
    }
    // configure OPENSSL_CONF
    // https://github.com/shogo82148/actions-setup-redis/issues/693
    let conf = path.join(redisPath, "..", "openssl.cnf");
    if (await exists(conf)) {
        process.env["OPENSSL_CONF"] = conf;
    }
    conf = path.join(redisPath, "..", "ssl", "openssl.cnf");
    if (await exists(conf)) {
        process.env["OPENSSL_CONF"] = conf;
    }
    const tlsPath = path.join(confPath, "tls");
    await io.mkdirP(tlsPath);
    const cacrt = path.join(tlsPath, "ca.crt");
    const cakey = path.join(tlsPath, "ca.key");
    const catxt = path.join(tlsPath, "ca.txt");
    core.setOutput("redis-tls-dir", tlsPath);
    const generateCert = async (name, cn, opts) => {
        const keyfile = path.join(tlsPath, `${name}.key`);
        const certfile = path.join(tlsPath, `${name}.crt`);
        await exec.exec(openssl, ["genrsa", "-out", keyfile, "2048"]);
        const output = await exec.getExecOutput(openssl, [
            "req",
            "-new",
            "-sha256",
            "-subj",
            `/O=Redis Test/CN=${cn}`,
            "-key",
            keyfile,
        ]);
        await exec.exec(openssl, [
            "x509",
            "-req",
            "-sha256",
            "-CA",
            cacrt,
            "-CAkey",
            cakey,
            "-CAserial",
            catxt,
            "-CAcreateserial",
            "-days",
            "365",
            ...opts,
            "-out",
            certfile,
        ], {
            input: Buffer.from(output.stdout, "utf-8"),
        });
    };
    await exec.exec(openssl, ["genrsa", "-out", cakey, "4096"]);
    await exec.exec(openssl, [
        "req",
        "-x509",
        "-new",
        "-nodes",
        "-sha256",
        "-key",
        cakey,
        "-days",
        "3650",
        "-subj",
        "/O=Redis Test/CN=Certificate Authority",
        "-out",
        cacrt,
    ]);
    const opensslCnf = path.join(tlsPath, "openssl.cnf");
    await fs_1.promises.writeFile(opensslCnf, `[ server_cert ]
keyUsage = digitalSignature, keyEncipherment
nsCertType = server
[ client_cert ]
keyUsage = digitalSignature, keyEncipherment
nsCertType = client
`);
    await generateCert("server", "Server-only", ["-extfile", opensslCnf, "-extensions", "server_cert"]);
    await generateCert("client", "Client-only", ["-extfile", opensslCnf, "-extensions", "client_cert"]);
    await generateCert("redis", "Generic-cert", []);
    await exec.exec("openssl", ["dhparam", "-out", path.join(tlsPath, "redis.dh"), "2048"]);
    return `tls-port ${tlsPort}
tls-cert-file ${path.join(tlsPath, "redis.crt")}
tls-key-file ${path.join(tlsPath, "redis.key")}
tls-ca-cert-file ${path.join(tlsPath, "ca.crt")}
tls-dh-params-file ${path.join(tlsPath, "redis.dh")}
`;
}
async function sleep(waitSec) {
    return new Promise(function (resolve) {
        setTimeout(() => resolve(), waitSec * 1000);
    });
}
async function exists(filename) {
    try {
        await fs_1.promises.stat(filename);
    }
    catch {
        return false;
    }
    return true;
}
