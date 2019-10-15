"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const osPlat = os.platform();
const osArch = os.arch();
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'darwin') {
        baseLocation = '/Users';
    }
    else {
        baseLocation = '/home';
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
const availableVersions = ['5.0.5'];
function determineVersion(version) {
    for (let v of availableVersions) {
        if (semver.satisfies(v, version)) {
            return v;
        }
    }
    throw new Error('unable to get latest version');
}
async function getRedis(version) {
    const selected = determineVersion(version);
    // check cache
    let toolPath;
    toolPath = tc.find('redis', selected);
    if (!toolPath) {
        // download, extract, cache
        toolPath = await acquireRedis(selected);
        core.debug('redis tool is cached under ' + toolPath);
    }
    toolPath = path.join(toolPath, 'bin');
    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //
    core.addPath(toolPath);
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
        downloadPath = await tc.downloadTool(downloadUrl);
    }
    catch (error) {
        core.debug(error);
        throw `Failed to download version ${version}: ${error}`;
    }
    //
    // Extract
    //
    const extPath = await tc.extractTar(downloadPath);
    return await tc.cacheDir(extPath, 'redis', version);
}
function getFileName(version) {
    return `redis-${version}-${osPlat}-${osArch}.tar.gz`;
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
        return `https://shogo82148-actions-setup-redis.s3.amazonaws.com/v${actionsVersion}/${filename}`;
    });
}
