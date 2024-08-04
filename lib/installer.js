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
exports.getRedis = getRedis;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const tc = __importStar(require("@actions/tool-cache"));
const yaml = __importStar(require("js-yaml"));
const osPlat = os.platform();
const osArch = os.arch();
async function getAvailableVersions(distribution, minorVersion) {
    const promise = new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, "..", ".github", "workflows", `build-${distribution}-${minorVersion}.yml`), (err, data) => {
            if (err) {
                reject(err);
            }
            const info = yaml.load(data.toString());
            resolve(info);
        });
    });
    const info = await promise;
    return info.jobs.build.strategy.matrix[distribution];
}
const minorVersions = {
    redis: ["7.4", "7.2", "7.0", "6.2", "6.0", "5.0", "4.0", "3.2", "3.0", "2.8"],
    valkey: ["7.2"],
};
async function determineVersion(distribution, version) {
    if (version.startsWith("redis-")) {
        distribution = "redis";
        version = version.substring("redis-".length);
    }
    else if (version.startsWith("valkey-")) {
        distribution = "valkey";
        version = version.substring("valkey-".length);
    }
    if (!minorVersions[distribution]) {
        throw new Error(`unsupported distribution: ${distribution}`);
    }
    if (version === "latest") {
        const availableVersions = await getAvailableVersions(distribution, minorVersions[distribution][0]);
        return {
            distribution,
            version: availableVersions[0],
        };
    }
    for (const minorVersion of minorVersions[distribution]) {
        const availableVersions = await getAvailableVersions(distribution, minorVersion);
        for (const v of availableVersions) {
            if (semver.satisfies(v, version)) {
                return {
                    distribution,
                    version: v,
                };
            }
        }
    }
    throw new Error("unable to get latest version");
}
async function getRedis(distribution, version) {
    const selected = await determineVersion(distribution, version);
    // check cache
    let toolPath;
    toolPath = tc.find(selected.distribution, selected.version);
    if (!toolPath) {
        // download, extract, cache
        toolPath = await acquireRedis(selected.distribution, selected.version);
        core.info(`redis tool is cached under ${toolPath}`);
    }
    toolPath = path.join(toolPath, "bin");
    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //
    core.addPath(toolPath);
    core.saveState("REDIS_CLI", path.join(toolPath, "redis-cli"));
    return toolPath;
}
async function acquireRedis(distribution, version) {
    //
    // Download - a tool installer intimately knows how to get the tool (and construct urls)
    //
    const fileName = getFileName(distribution, version);
    const downloadUrl = await getDownloadUrl(fileName);
    let downloadPath = null;
    try {
        core.info(`downloading the binary from ${downloadUrl}`);
        downloadPath = await tc.downloadTool(downloadUrl);
    }
    catch (error) {
        if (error instanceof Error) {
            core.debug(`error: name: ${error.name}, message: ${error.message}`);
        }
        else {
            core.debug(`${error}`);
        }
        throw new Error(`Failed to download version ${version}: ${error}`);
    }
    //
    // Extract
    //
    const extPath = await tc.extractTar(downloadPath, "", ["--use-compress-program", "zstd -d --long=30", "-x"]);
    return await tc.cacheDir(extPath, "redis", version);
}
function getFileName(distribution, version) {
    switch (osPlat) {
        case "linux":
            break;
        case "darwin":
            break;
        default:
            throw new Error(`unsupported platform: ${osPlat}`);
    }
    return `${distribution}-${version}-${osPlat}-${osArch}.tar.zstd`;
}
async function getDownloadUrl(filename) {
    const promise = new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, "..", "package.json"), (err, data) => {
            if (err) {
                reject(err);
            }
            const info = JSON.parse(data.toString());
            resolve(info);
        });
    });
    const info = await promise;
    const actionsVersion = info.version;
    return `https://github.com/shogo82148/actions-setup-redis/releases/download/v${actionsVersion}/${filename}`;
}
