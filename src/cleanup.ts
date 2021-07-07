import * as core from '@actions/core';
import * as exec from '@actions/exec';

export async function shutdownRedis(cli: string, sock: string) {
  if (cli === '' || sock === '') {
    return; // no need to shutdown redis-server
  }
  core.info('shutdown redis-server');
  await exec.exec(cli, ['-s', sock, 'shutdown']);
}
