import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * Standard Prisma Client with Neon's pgbouncer pooler.
 * 
 * WHY THIS IS FASTER:
 * The old PrismaNeon WebSocket adapter created a NEW WebSocket handshake
 * for every single query (~100-300ms overhead each). On a persistent
 * Node.js server, this is catastrophic under load.
 * 
 * Standard PrismaClient uses the `pg` driver with persistent TCP
 * connections that are reused via Neon's pgbouncer pooler.
 * This drops per-query overhead from ~200ms to ~5ms.
 * 
 * CONNECTION POOL TUNING:
 * - connection_limit: Set via DATABASE_URL param or Prisma default (num_cpus * 2 + 1)
 * - For 100 concurrent users with 6 parallel queries per request,
 *   we need ~15-20 connections. Neon free tier allows 5-7.
 */

const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['warn', 'error'] 
    : [
        { level: 'error', emit: 'stdout' },
        // Log slow queries (>2s) in production for monitoring
        { level: 'query', emit: 'event' },
      ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Log slow queries in production (>2000ms)
if (process.env.NODE_ENV !== 'development') {
  prisma.$on?.('query', (e) => {
    if (e.duration > 2000) {
      console.warn(`🐌 SLOW QUERY (${e.duration}ms): ${e.query?.substring(0, 200)}`);
    }
  });
}

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

export default prisma;