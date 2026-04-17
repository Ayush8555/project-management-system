/**
 * Node.js Cluster Mode — utilizes all CPU cores for production.
 * 
 * Each worker runs its own instance of server.js with its own
 * event loop, allowing true parallel request handling.
 * 
 * Usage: node cluster.js
 * Only use in production on persistent servers (Render, VPS, etc.)
 * NOT for serverless (Vercel, AWS Lambda).
 */

import cluster from 'node:cluster';
import { cpus } from 'node:os';
import process from 'node:process';

const numWorkers = Math.min(cpus().length, 4); // Cap at 4 to avoid memory issues

if (cluster.isPrimary) {
  console.log(`🔧 Primary ${process.pid} starting ${numWorkers} workers...`);

  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // Replace crashed workers
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠️ Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('🛑 Shutting down all workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }
    setTimeout(() => process.exit(0), 5000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  // Workers run the Express server
  await import('./server.js');
  console.log(`✅ Worker ${process.pid} started`);
}
