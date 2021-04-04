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
exports.getRedis = void 0;
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const yaml = __importStar(require("js-yaml"));
const osPlat = os.platform();
const osArch = os.arch();
async function getAvailableVersions(minorVersion) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, '..', '.github', 'workflows', `build-${minorVersion}.yml`), (err, data) => {
            if (err) {
                reject(err);
            }
            const info = yaml.load(data.toString());
            resolve(info);
        });
    }).then((info) => {
        return info.jobs.build.strategy.matrix.redis;
    });
}
const minorVersions = ['6.2', '6.0', '5.0', '4.0', '3.2', '3.0', '2.8'];
async function determineVersion(version) {
    if (version === 'latest') {
        const availableVersions = await getAvailableVersions(minorVersions[0]);
        return availableVersions[0];
    }
    for (let minorVersion of minorVersions) {
        const availableVersions = await getAvailableVersions(minorVersion);
        for (let v of availableVersions) {
            if (semver.satisfies(v, version)) {
                return v;
            }
        }
    }
    throw new Error('unable to get latest version');
}
async function getRedis(version) {
    const selected = await determineVersion(version);
    // check cache
    let toolPath;
    toolPath = tc.find('redis', selected);
    if (!toolPath) {
        // download, extract, cache
        toolPath = await acquireRedis(selected);
        core.info('redis tool is cached under ' + toolPath);
    }
    toolPath = path.join(toolPath, 'bin');
    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //
    core.addPath(toolPath);
    core.saveState('REDIS_CLI', path.join(toolPath, 'redis-cli'));
    return toolPath;
}
exports.getRedis = getRedis;
async function acquireRedis(version) {
    //
    // Download - a tool installer intimately knows how to get the tool (and construct urls)
    //
    const fileName = getFileName(version);
    const downloadUrl = await getDownloadUrl(fileName);
    let downloadPath = null;
    try {
        core.info('downloading the binary from ' + downloadUrl);
        downloadPath = await tc.downloadTool(downloadUrl);
    }
    catch (error) {
        core.debug(error);
        throw `Failed to download version ${version}: ${error}`;
    }
    //
    // Extract
    //
    const extPath = await tc.extractTar(downloadPath, '', 'xJ');
    return await tc.cacheDir(extPath, 'redis', version);
}
function getFileName(version) {
    return `redis-${version}-${osPlat}-${osArch}.tar.xz`;
}
async function getDownloadUrl(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, '..', 'package.json'), (err, data) => {
            if (err) {
                reject(err);
            }
            const info = JSON.parse(data.toString());
            resolve(info);
        });
    }).then(info => {
        const actionsVersion = info.version;
        return `https://setupredis.blob.core.windows.net/actions-setup-redis/v${actionsVersion}/${filename}`;
    });
}
