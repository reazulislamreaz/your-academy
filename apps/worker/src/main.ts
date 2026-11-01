import { Entitlement } from '@confiro/shared';

/**
 * Phase 1 stub worker process.
 * Phase 9 will register BullMQ processors here.
 */
function main() {
  const service = process.env.APP_NAME ?? 'confiro';
  console.log(
    `[${service}-worker] stub running (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
  );
  console.log(`[${service}-worker] shared package OK: ${Entitlement.VIEW_ANSWERS}`);

  const shutdown = (signal: string) => {
    console.log(`[${service}-worker] received ${signal}, shutting down`);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive in Docker/dev until BullMQ is wired.
  setInterval(() => {
    // heartbeat noop
  }, 60_000);
}

main();
