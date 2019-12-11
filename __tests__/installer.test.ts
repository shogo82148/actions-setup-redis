import * as io from '@actions/io';
import * as exec from '@actions/exec';
import path = require('path');
import os = require('os');
import fs = require('fs');

const toolDir = path.join(__dirname, 'runner', 'tools');
const tempDir = path.join(__dirname, 'runner', 'temp');

process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;
import * as installer from '../src/installer';
import * as starter from '../src/starter';
import * as cleanup from '../src/cleanup';

describe('installer tests', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  }, 100000);

  afterAll(async () => {
    try {
      await io.rmRF(toolDir);
      await io.rmRF(tempDir);
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 100000);

  it('Acquires version of redis if no matching version is installed', async () => {
    await installer.getRedis('2.x');
    const redisDir = path.join(toolDir, 'redis', '2.8.24', os.arch());

    expect(fs.existsSync(`${redisDir}.complete`)).toBe(true);
    expect(fs.existsSync(path.join(redisDir, 'bin', 'redis-server'))).toBe(
      true
    );
  }, 100000);

  it('start and shutdown redis-server', async () => {
    const redisPath = await installer.getRedis('4.x');
    const cli = path.join(redisPath, 'redis-cli');
    await starter.startRedis(tempDir, redisPath, 6379);
    await cleanup.shutdownRedis(cli, '6379');

    // this command will fail, because the redis-server will be shutdown by cleanup.shutdownRedis();
    const exitCode = await exec.exec(
      cli,
      ['-h', '127.0.0.1', '-p', '6379', 'shutdown'],
      {
        ignoreReturnCode: true
      }
    );
    expect(exitCode).toBeGreaterThan(0);
  }, 100000);
});
