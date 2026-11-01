import { Entitlement } from '@your-academy/shared';

/**
 * Worker process stub.
 * Phase 9 will register BullMQ processors here.
 */
function main() {
  const service = process.env.APP_NAME ?? 'your-academy';
  console.log(
    `[${service}-worker] stub running (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
  );
  console.log(`[${service}-worker] shared package OK: ${Entitlement.VIEW_ANSWERS}`);

  const keepAlive = setInterval(() => {
    // Keep process alive until BullMQ workers are registered.
  }, 60_000);

  const shutdown = (signal: string) => {
    console.log(`[${service}-worker] received ${signal}, shutting down`);
    clearInterval(keepAlive);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
