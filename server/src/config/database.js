import mongoose from 'mongoose';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
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

async function ensureLocalMongod() {
  const isOpen = await isPortOpen(27017, '127.0.0.1');
  if (isOpen) return;

  const dbPath = '/tmp/mongo_data';
  try {
    mkdirSync(dbPath, { recursive: true });
  } catch {}

  spawnedMongod = spawn(
    'mongod',
    ['--dbpath', dbPath, '--bind_ip', '127.0.0.1', '--port', '27017', '--quiet'],
    { stdio: 'ignore' }
  );

  // Clean shutdown handler
  process.on('exit', () => {
    if (spawnedMongod && !spawnedMongod.killed) {
      try {
        spawnedMongod.kill('SIGINT');
      } catch {}
    }
  });

  // Wait up to 5 seconds for mongod to accept connections
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const ready = await isPortOpen(27017, '127.0.0.1');
    if (ready) return;
  }
}

export async function connectDatabase() {
  await ensureLocalMongod();
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { autoIndex: env.NODE_ENV !== 'production' });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (spawnedMongod && !spawnedMongod.killed) {
    try {
      spawnedMongod.kill('SIGINT');
    } catch {}
  }
}
