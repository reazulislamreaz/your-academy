import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import nodemailer from 'nodemailer';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const service = process.env.APP_NAME ?? 'your-academy';

type PasswordResetJob = {
  to: string;
  resetUrl: string;
  userId: string;
};

async function sendPasswordResetEmail(data: PasswordResetJob) {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const from = process.env.EMAIL_FROM ?? 'noreply@your-academy.local';

  if (!host) {
    console.log(`[${service}-worker] SMTP_HOST unset — logging password reset for ${data.to}`);
    console.log(`[${service}-worker] resetUrl=${data.resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from,
      to: data.to,
      subject: 'Reset your Your Academy password',
      text: `Reset your password using this link (expires soon):\n\n${data.resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<p>Reset your password using this link (expires soon):</p><p><a href="${data.resetUrl}">${data.resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`,
    });
    console.log(`[${service}-worker] password-reset email sent to ${data.to}`);
  } catch (err) {
    // Local Mailhog often isn't running — log link so resets stay usable.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[${service}-worker] SMTP send failed (${String(err)}); logging resetUrl for ${data.to}`,
      );
      console.log(`[${service}-worker] resetUrl=${data.resetUrl}`);
      return;
    }
    throw err;
  }
}

async function main() {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const emailQueue = new Queue('email-queue', { connection });
  const maintenanceQueue = new Queue('maintenance-queue', { connection });

  const emailWorker = new Worker(
    'email-queue',
    async (job) => {
      if (job.name === 'password-reset') {
        await sendPasswordResetEmail(job.data as PasswordResetJob);
        return;
      }
      console.log(`[${service}-worker] email job ${job.id}`, job.name, job.data);
    },
    { connection, concurrency: 5 },
  );

  const maintenanceWorker = new Worker(
    'maintenance-queue',
    async (job) => {
      // Orphan Cloudinary deletes / soft-delete cleanup — logged until ops jobs expand.
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
