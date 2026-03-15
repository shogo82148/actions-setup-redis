import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as semver from "semver";
import * as crypto from "crypto";
import * as tc from "@actions/tool-cache";
import redisVersions from "../versions/redis.json" with { type: "json" };
import valkeyVersions from "../versions/valkey.json" with { type: "json" };

const osPlat = os.platform();
const osArch = os.arch();

interface Version {
  distribution: string;
  arch: string;
  os: string;
  sha256: string;
  url: string;
  version: string;
}

export interface Redis {
  distribution: string;
  version: string;
}

function determineVersion(distribution: string, version: string): Version {
  if (version.startsWith("redis-")) {
    distribution = "redis";
    version = version.substring("redis-".length);
  } else if (version.startsWith("valkey-")) {
    distribution = "valkey";
    version = version.substring("valkey-".length);
  }

  const availableVersions = distribution === "redis" ? redisVersions : valkeyVersions;

  if (version === "latest") {
    for (const v of availableVersions) {
      if (v.arch === osArch && v.os === osPlat) {
        return v;
      }
    }
  } else {
    for (const v of availableVersions) {
      if (v.arch === osArch && v.os === osPlat && semver.satisfies(v.version, version)) {
        return v;
      }
    }
  }
  throw new Error("unable to get latest version");
}

export async function getRedis(distribution: string, version: string): Promise<string> {
  const selected = determineVersion(distribution, version);

  // check cache
  let toolPath: string;
  toolPath = tc.find(selected.distribution, selected.version);

  if (!toolPath) {
    // download, extract, cache
    toolPath = await acquireRedis(selected.distribution, selected);
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

async function acquireRedis(distribution: string, version: Version): Promise<string> {
  //
  // Download - a tool installer intimately knows how to get the tool (and construct urls)
  //
  let downloadPath: string | null = null;
  try {
    core.info(`downloading the binary from ${version.url}`);
    downloadPath = await tc.downloadTool(version.url);
    core.info(`downloaded to ${downloadPath}`);
  } catch (error) {
    if (error instanceof Error) {
      core.debug(`error: name: ${error.name}, message: ${error.message}`);
    } else {
      core.debug(`${error}`);
    }

    throw new Error(`Failed to download version ${version}: ${error}`);
  }

  //
  // Verify SHA256
  //
  core.info(`verifying the binary...`);
  const hash = await calculateDigest(downloadPath, "sha256");
  if (hash !== version.sha256) {
    throw new Error(
      `Hash for downloaded MySQL version ${version.version} (${hash}) does not match expected value (${version.sha256})`,
    );
  }

  //
  // Extract
  //
  const extPath = await tc.extractTar(downloadPath, "", ["--use-compress-program", "zstd -d --long=30", "-x"]);

  return await tc.cacheDir(extPath, "redis", version.version);
}

async function calculateDigest(filename: string, algorithm: string): Promise<string> {
  const hash = await new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filename);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
  return hash;
}
