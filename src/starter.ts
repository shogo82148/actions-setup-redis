import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';
import {promises as fs} from 'fs';

export async function startRedis(
  confPath: string,
  redisPath: string,
  port: number
) {
  await io.mkdirP(confPath);
  const pid = path.join(confPath, 'redis.pid');
  const log = path.join(confPath, 'redis.log');
  const conf = path.join(confPath, 'redis.conf');

  // XXX: In some systems, the length of unix domain socket path may limit 92 bytes.
  // so the shorter the file name, the better.
  // https://man7.org/linux/man-pages/man7/unix.7.html
  const sock = path.join(confPath, 's');

  core.saveState('REDIS_UNIX_SOCKET', sock);
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
  await fs.writeFile(conf, confContents);

  core.info('starting redis-server');
  const server = path.join(redisPath, 'redis-server');
  await exec.exec(server, [conf]);

  core.info('wait for redis-server to become ready');
  const cli = path.join(redisPath, 'redis-cli');
  const option = {
    ignoreReturnCode: true
  };
  for (let i = 0; ; i++) {
    const exitCode = await exec.exec(cli, ['-s', sock, 'ping'], option);
    core.debug(`ping exits with ${exitCode}`);
    if (exitCode === 0) {
      return;
    }
    if (i >= 10) {
      core.debug('give up');
      break;
    }
    core.debug('wait a little');
    await sleep(1);
  }

  // launch failed, show the log
  const logContents = await fs.readFile(log);
  core.info('redis-server log:');
  core.info(logContents.toString());
  throw new Error('fail to launch redis-server');
}

function sleep(waitSec: number): Promise<void> {
  return new Promise<void>(function (resolve) {
    setTimeout(() => resolve(), waitSec * 1000);
  });
}
