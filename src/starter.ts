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

  core.saveState('REDIS_PORT', port.toString());

  const pid = path.join(baseDir, 'redis.pid');
  const log = path.join(baseDir, 'redis.log');
  const conf = path.join(baseDir, 'redis.conf');

  // generate the configure file
  const confContents = `
daemonize yes
pidfile ${pid}
port ${port}
bind 127.0.0.1
logfile ${log}
`;
  fs.writeFileSync(conf, confContents);

  core.debug('starting redis-server');
  const server = path.join(redisPath, 'redis-server');
  const exitCode = await exec.exec(server, [conf]);
  if (exitCode !== 0) {
    throw 'fail to launch redis-server';
  }

  core.debug('wait for redis-server to become ready');
  const cli = path.join(redisPath, 'redis-cli');
  for (let i = 0; i < 10; i++) {
    const exitCode = await exec.exec(
      cli,
      ['-h', '127.0.0.1', '-p', `${port}`, 'ping'],
      {
        ignoreReturnCode: true
      }
    );
    core.debug(`ping exits with ${exitCode}`);
    if (exitCode === 0) {
      return;
    }
    await sleep(1);
  }
  throw new Error('fail to launch redis-server');
}

function sleep(waitSec: number) {
  return new Promise(function (resolve) {
    setTimeout(() => resolve(), waitSec);
  });
}
