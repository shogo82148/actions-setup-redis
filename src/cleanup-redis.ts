import * as core from '@actions/core';
import * as cleanup from './cleanup';

async function run() {
  try {
    cleanup.shutdownRedis(
      core.getState('REDIS_CLI'),
      core.getState('REDIS_UNIX_SOCKET')
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
