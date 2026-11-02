import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const service = process.env.APP_NAME ?? 'your-academy';

async function main() {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const emailQueue = new Queue('email-queue', { connection });
  const maintenanceQueue = new Queue('maintenance-queue', { connection });

  const emailWorker = new Worker(
    'email-queue',
    async (job) => {
      // Idempotent stub: log only until SMTP is configured.
      console.log(`[${service}-worker] email job ${job.id}`, job.name, job.data);
    },
    { connection, concurrency: 5 },
  );

  const maintenanceWorker = new Worker(
    'maintenance-queue',
    async (job) => {
      console.log(`[${service}-worker] maintenance job ${job.id}`, job.name, job.data);
    },
    { connection, concurrency: 2 },
  );

  emailWorker.on('failed', (job, err) => {
    console.error(`[${service}-worker] email failed`, job?.id, err.message);
  });
  maintenanceWorker.on('failed', (job, err) => {
    console.error(`[${service}-worker] maintenance failed`, job?.id, err.message);
  });

  console.log(`[${service}-worker] BullMQ workers online`);

  const shutdown = async (signal: string) => {
    console.log(`[${service}-worker] ${signal} — closing`);
    await Promise.all([emailWorker.close(), maintenanceWorker.close()]);
    await Promise.all([emailQueue.close(), maintenanceQueue.close()]);
    await connection.quit();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
