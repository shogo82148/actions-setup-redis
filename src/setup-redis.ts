import * as core from "@actions/core";
import * as installer from './installer';

async function run() {
  try {
    const version = core.getInput('redis-version');
    if (version) {
      await installer.getRedis(version);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
