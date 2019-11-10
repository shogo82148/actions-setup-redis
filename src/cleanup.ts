import * as core from '@actions/core';
import * as exec from '@actions/exec';

export async function shutdownRedis(port: string) {
  if (port === '') {
    return; // no need to shutdown redis-server
  }
  core.debug('shutdown redis-server');
  await exec.exec('redis-cli', ['-h', '127.0.0.1', '-p', port, 'shutdown']);
}
