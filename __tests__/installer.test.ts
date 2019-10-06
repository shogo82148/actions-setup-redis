import io = require('@actions/io');
import path = require('path');
import os = require('os');
import fs = require('fs');

const toolDir = path.join(__dirname, 'runner', 'tools');
const tempDir = path.join(__dirname, 'runner', 'temp');

process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;
import * as installer from '../src/installer';

describe('installer tests', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
  }, 100000);

  afterAll(async () => {
    try {
      // await io.rmRF(toolDir);
      // await io.rmRF(tempDir);
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 100000);

  it('Acquires version of redis if no matching version is installed', async () => {
    await installer.getRedis('5.0.5');
    const redisDir = path.join(toolDir, 'redis', '5.0.5', os.arch());

    expect(fs.existsSync(`${redisDir}.complete`)).toBe(true);
    expect(fs.existsSync(path.join(redisDir, 'bin', 'redis-server'))).toBe(
      true
    );
  }, 100000);
});
