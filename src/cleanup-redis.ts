import * as core from '@actions/core';
import * as cleanup from './cleanup';
import * as io from '@actions/io';

async function run() {
  try {
    await cleanup.shutdownRedis(
      core.getState('REDIS_CLI'),
      core.getState('REDIS_UNIX_SOCKET')
    );
    const confDir = core.getState('REDIS_CONF_DIR');
    if (confDir !== '') {
      await io.rmRF(confDir);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
