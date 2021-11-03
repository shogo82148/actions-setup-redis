import * as core from '@actions/core';
import * as installer from './installer';
import * as path from 'path';
import * as starter from './starter';
import {promises as fs} from 'fs';

async function run(): Promise<void> {
  try {
    const required = {required: true};
    const version = core.getInput('redis-version', required);
    const port = parseInt(core.getInput('redis-port', required));
    const tlsPort = parseInt(core.getInput('redis-tls-port', required));
    const autoStart = core.getBooleanInput('auto-start', required);
    const configure = core.getInput('redis-conf');

    const redisPath = await core.group(
      'install redis',
      async (): Promise<string> => {
        return await installer.getRedis(version);
      }
    );
    if (autoStart) {
      await core.group('start redis', async () => {
        const tempDir = process.env['RUNNER_TEMP'] || '/tmp';
        const confPath = await fs.mkdtemp(tempDir + path.sep);
        await starter.startRedis({
          confPath,
          redisPath,
          port,
          tlsPort,
          configure
        });
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error);
    } else {
      core.setFailed(`${error}`);
    }
  }
}

void run();
