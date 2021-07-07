import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as installer from './installer';
import * as starter from './starter';

async function run() {
  try {
    const required = {required: true};
    const version = core.getInput('redis-version', required);
    const port = parseInt(core.getInput('redis-port', required));
    const autoStart = core.getBooleanInput('auto-start', required);

    const redisPath = await core.group('install redis', async () => {
      return installer.getRedis(version);
    });
    if (autoStart) {
      core.group('start redis', async () => {
        const tempDir = process.env['RUNNER_TEMP'] || '/tmp';
        const confDir = await fs.mkdtemp(tempDir + path.sep);
        await starter.startRedis(confDir, redisPath, port);
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
