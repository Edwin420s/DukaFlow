import mongoose from 'mongoose';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdirSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { env } from './env.js';

let spawnedMongod = null;

function isPortOpen(port = 27017, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function trySpawnMongod(port, dbPath) {
  try {
    mkdirSync(dbPath, { recursive: true });
    const lockPath = path.join(dbPath, 'mongod.lock');
    if (existsSync(lockPath)) unlinkSync(lockPath);
    const sockPath = `/tmp/mongodb-${port}.sock`;
    if (existsSync(sockPath)) unlinkSync(sockPath);
  } catch {}

  const proc = spawn(
    'mongod',
    ['--dbpath', dbPath, '--bind_ip', '127.0.0.1', '--port', String(port), '--nounixsocket', '--quiet'],
    { stdio: 'ignore' }
  );

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (await isPortOpen(port, '127.0.0.1')) {
      proc.unref();
      return proc;
    }
    if (proc.exitCode !== null) break;
  }

  try {
    proc.kill('SIGINT');
  } catch {}
  return null;
}

async function ensureLocalMongod() {
  const isTest = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test' || process.argv.some((a) => a.includes('test'));
  const targetPort = isTest ? 27019 : 27017;
  const targetDbPath = isTest ? '/tmp/dukaflow_test_db' : '/tmp/mongo_data';
  const targetUri = `mongodb://127.0.0.1:${targetPort}/retail_platform`;

  // Check if target port is already accepting connections
  if (await isPortOpen(targetPort, '127.0.0.1')) {
    return targetUri;
  }

  // Try spawning mongod on target port
  spawnedMongod = await trySpawnMongod(targetPort, targetDbPath);
  if (spawnedMongod) {
    process.on('exit', () => {
      try { spawnedMongod?.kill('SIGINT'); } catch {}
    });
    return targetUri;
  }

  // Fallback check on port 27017 if not in test
  if (!isTest && await isPortOpen(27017, '127.0.0.1')) {
    return env.MONGODB_URI;
  }

  return targetUri;
}

export async function connectDatabase() {
  const workingUri = await ensureLocalMongod();
  mongoose.set('strictQuery', true);
  await mongoose.connect(workingUri, { autoIndex: env.NODE_ENV !== 'production' });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
