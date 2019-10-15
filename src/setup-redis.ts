import * as core from '@actions/core';
import * as installer from './installer';
import * as starter from './starter';

async function run() {
  try {
    const version = core.getInput('redis-version');
    const port = parseInt(core.getInput('redis-port'));
    const autoStart = parseBoolean(core.getInput('auto-start'));
    if (!version) {
      return;
    }

    const redisPath = await core.group('install redis', async () => {
      return installer.getRedis(version);
    });
    if (autoStart) {
      core.group('start redis', async () => {
        const confDir = process.env['RUNNER_TEMP'] || '/tmp';
        await starter.startRedis(confDir, redisPath, port);
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

function parseBoolean(s: string): boolean {
  switch (s) {
    case 'y':
    case 'Y':
    case 'yes':
    case 'Yes':
    case 'YES':
    case 'true':
    case 'True':
    case 'TRUE':
      return true;
    case 'n':
    case 'N':
    case 'no':
    case 'No':
    case 'NO':
    case 'false':
    case 'False':
    case 'FALSE':
      return false;
  }
  throw `invalid boolean value: ${s}`;
}
run();
