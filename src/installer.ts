import * as core from '@actions/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import * as tc from '@actions/tool-cache';
import * as yaml from 'js-yaml';

const osPlat = os.platform();
const osArch = os.arch();

interface Workflow {
  jobs: Jobs;
}

interface Jobs {
  build: Job;
}

interface Job {
  strategy: Strategy;
}

interface Strategy {
  matrix: Matrix;
}

interface Matrix {
  redis: string[];
}

async function getAvailableVersions(minorVersion: string): Promise<string[]> {
  const promise = new Promise<Workflow>((resolve, reject) => {
    fs.readFile(
      path.join(
        __dirname,
        '..',
        '.github',
        'workflows',
        `build-${minorVersion}.yml`
      ),
      (err, data) => {
        if (err) {
          reject(err);
        }
        const info = yaml.load(data.toString()) as Workflow;
        resolve(info);
      }
    );
  });

  const info = await promise;
  return info.jobs.build.strategy.matrix.redis;
}

const minorVersions = ['6.2', '6.0', '5.0', '4.0', '3.2', '3.0', '2.8'];

async function determineVersion(version: string): Promise<string> {
  if (version === 'latest') {
    const availableVersions = await getAvailableVersions(minorVersions[0]);
    return availableVersions[0];
  }
  for (const minorVersion of minorVersions) {
    const availableVersions = await getAvailableVersions(minorVersion);
    for (const v of availableVersions) {
      if (semver.satisfies(v, version)) {
        return v;
      }
    }
  }
  throw new Error('unable to get latest version');
}

export async function getRedis(version: string): Promise<string> {
  const selected = await determineVersion(version);

  // check cache
  let toolPath: string;
  toolPath = tc.find('redis', selected);

  if (!toolPath) {
    // download, extract, cache
    toolPath = await acquireRedis(selected);
    core.info(`redis tool is cached under ${toolPath}`);
  }

  toolPath = path.join(toolPath, 'bin');
  //
  // prepend the tools path. instructs the agent to prepend for future tasks
  //
  core.addPath(toolPath);
  core.saveState('REDIS_CLI', path.join(toolPath, 'redis-cli'));
  return toolPath;
}

async function acquireRedis(version: string): Promise<string> {
  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  //
  const fileName = getFileName(version);
  const downloadUrl = await getDownloadUrl(fileName);
  let downloadPath: string | null = null;
  try {
    core.info(`downloading the binary from ${downloadUrl}`);
    downloadPath = await tc.downloadTool(downloadUrl);
  } catch (error) {
    if (error instanceof Error) {
      core.debug(`error: name: ${error.name}, message: ${error.message}`);
    } else {
      core.debug(`${error}`);
    }

    throw new Error(`Failed to download version ${version}: ${error}`);
  }

  //
  // Extract
  //
  const extPath = await tc.extractTar(downloadPath, '', [
    '--use-compress-program',
    'zstd -d --long=30',
    '-x'
  ]);

  return await tc.cacheDir(extPath, 'redis', version);
}

function getFileName(version: string): string {
  switch (osPlat) {
    case 'linux':
      break;
    case 'darwin':
      break;
    default:
      throw new Error(`unsupported platform: ${osPlat}`);
  }
  return `redis-${version}-${osPlat}-${osArch}.tar.zstd`;
}

interface PackageVersion {
  version: string;
}

async function getDownloadUrl(filename: string): Promise<string> {
  const promise = new Promise<PackageVersion>((resolve, reject) => {
    fs.readFile(path.join(__dirname, '..', 'package.json'), (err, data) => {
      if (err) {
        reject(err);
      }
      const info: PackageVersion = JSON.parse(data.toString());
      resolve(info);
    });
  });

  const info = await promise;
  const actionsVersion = info.version;
  return `https://github.com/shogo82148/actions-setup-redis/releases/download/v${actionsVersion}/${filename}`;
}
