import * as core from '@actions/core';
import * as exec from '@actions/exec';

export async function shutdownRedis(cli: string, port: string) {
  if (cli === '' || port === '') {
    return; // no need to shutdown redis-server
  }
  core.info('shutdown redis-server');
  await exec.exec(cli, ['-h', '127.0.0.1', '-p', port, 'shutdown']);
}
