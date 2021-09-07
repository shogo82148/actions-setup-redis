import * as io from '@actions/io';
import * as exec from '@actions/exec';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as os from 'os';

const toolDir = path.join(__dirname, 'r', 'tools');
const tempDir = path.join(__dirname, 'r', 'tmp');

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

    expect(await exists(`${redisDir}.complete`)).toBe(true);
    expect(await exists(path.join(redisDir, 'bin', 'redis-server'))).toBe(true);
  }, 100000);

  it('start and shutdown redis-server', async () => {
    const confPath = await fs.mkdtemp(tempDir + path.sep);
    const redisPath = await installer.getRedis('4.x');
    const cli = path.join(redisPath, 'redis-cli');
    await starter.startRedis({
      confPath,
      redisPath,
      port: 6379,
      tlsPort: 0,
      configure: ''
    });
    await cleanup.shutdownRedis(cli, path.join(confPath, 's'));

    // this command will fail, because the redis-server will be shutdown by cleanup.shutdownRedis();
    const option = {
      ignoreReturnCode: true
    };
    const exitCode = await exec.exec(
      cli,
      ['-h', '127.0.0.1', '-p', '6379', 'shutdown'],
      option
    );
    expect(exitCode).toBeGreaterThan(0);
  }, 100000);
});

async function exists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
  } catch {
    return false;
  }
  return true;
}
