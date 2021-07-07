import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';
import * as fs from 'fs';

export async function startRedis(
  confPath: string,
  redisPath: string,
  port: number
) {
  const baseDir = path.join(confPath, 'redis');
  await io.mkdirP(baseDir);

  const pid = path.join(baseDir, 'redis.pid');
  const log = path.join(baseDir, 'redis.log');
  const conf = path.join(baseDir, 'redis.conf');
  const sock = path.join(baseDir, 'redis.sock');

  core.saveState('REDIS_UNIX_SOCKET', port.toString());
  core.setOutput('redis-unix-socket', sock);
  core.setOutput('redis-port', port.toString());

  // generate the configure file
  const confContents = `
daemonize yes
pidfile ${pid}
port ${port}
bind 127.0.0.1
unixsocket ${sock}
unixsocketperm 700
logfile ${log}
`;
  fs.writeFileSync(conf, confContents);

  core.info('starting redis-server');
  const server = path.join(redisPath, 'redis-server');
  const exitCode = await exec.exec(server, [conf]);
  if (exitCode !== 0) {
    throw 'fail to launch redis-server';
  }

  core.info('wait for redis-server to become ready');
  const cli = path.join(redisPath, 'redis-cli');
  for (let i = 0; i < 10; i++) {
    const exitCode = await exec.exec(cli, ['-s', sock], {
      ignoreReturnCode: true
    });
    core.debug(`ping exits with ${exitCode}`);
    if (exitCode === 0) {
      return;
    }
    await sleep(1);
  }
  throw new Error('fail to launch redis-server');
}

function sleep(waitSec: number): Promise<void> {
  return new Promise<void>(function (resolve) {
    setTimeout(() => resolve(), waitSec);
  });
}
