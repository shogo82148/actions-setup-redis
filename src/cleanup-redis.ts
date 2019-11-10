import * as core from '@actions/core';
import * as cleanup from './cleanup';

async function run() {
  try {
    cleanup.shutdownRedis(core.getState('REDIS_PORT'));
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
