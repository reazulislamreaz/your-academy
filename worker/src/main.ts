import { BrowsingSessionStatus, PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import IORedis from 'ioredis';
import nodemailer from 'nodemailer';

const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const service = process.env.APP_NAME ?? 'your-academy';
const prisma = new PrismaClient();

type PasswordResetJob = {
  to: string;
  resetUrl: string;
  userId: string;
};

type DeleteAssetJob = {
  mediaAssetId: string;
  publicId: string;
  resourceType: 'image' | 'raw';
};

function configureCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (
    !cloud_name ||
    !api_key ||
    !api_secret ||
    cloud_name === 'demo' ||
    api_key === 'demo' ||
    api_secret === 'demo_secret_change_me'
  ) {
    return false;
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return true;
}

async function sendPasswordResetEmail(data: PasswordResetJob) {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const from = process.env.EMAIL_FROM ?? 'noreply@your-academy.local';

  if (!host) {
    // Never log reset URLs/tokens outside local development — they are bearer secrets.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SMTP_HOST is required in production to deliver password-reset emails (refusing to log reset URLs)',
      );
    }
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

async function deleteCloudinaryAsset(data: DeleteAssetJob) {
  const configured = configureCloudinary();
  if (!configured) {
    console.log(
      `[${service}-worker] Cloudinary unset — marking media ${data.mediaAssetId} deleted locally only`,
    );
  } else {
    try {
      await cloudinary.uploader.destroy(data.publicId, {
        resource_type: data.resourceType,
      });
      console.log(`[${service}-worker] destroyed Cloudinary asset ${data.publicId}`);
    } catch (err) {
      // Idempotent: missing remote assets are fine.
      console.warn(
        `[${service}-worker] Cloudinary destroy ignored for ${data.publicId}: ${String(err)}`,
      );
    }
  }

  await prisma.mediaAsset.updateMany({
    where: { id: data.mediaAssetId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

async function expireStaleSessions() {
  const cutoff = new Date(Date.now() - 2 * 60_000);
  const result = await prisma.browsingSession.updateMany({
    where: {
      status: BrowsingSessionStatus.ACTIVE,
      lastHeartbeatAt: { lt: cutoff },
    },
    data: { status: BrowsingSessionStatus.EXPIRED, endedAt: new Date() },
  });
  if (result.count > 0) {
    console.log(`[${service}-worker] expired ${result.count} stale browsing sessions`);
  }
}

async function orphanMediaScan(maintenanceQueue: Queue) {
  // Soft-deleted documents whose media row is still live need remote cleanup.
  const docs = await prisma.document.findMany({
    where: { deletedAt: { not: null }, mediaAsset: { deletedAt: null } },
    take: 50,
    orderBy: { deletedAt: 'asc' },
    select: {
      mediaAsset: { select: { id: true, publicId: true, resourceType: true } },
    },
  });

  let enqueued = 0;
  for (const doc of docs) {
    const asset = doc.mediaAsset;
    if (asset.publicId.startsWith('seed/') || asset.publicId.startsWith('admin-placeholder/')) {
      await prisma.mediaAsset.updateMany({
        where: { id: asset.id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      continue;
    }
    await maintenanceQueue.add(
      'delete-asset',
      {
        mediaAssetId: asset.id,
        publicId: asset.publicId,
        resourceType: asset.resourceType === 'RAW' ? 'raw' : 'image',
      } satisfies DeleteAssetJob,
      { jobId: `delete-asset-${asset.id}` },
    );
    enqueued += 1;
  }
  if (enqueued > 0) {
    console.log(`[${service}-worker] orphan-media-scan enqueued ${enqueued} deletes`);
  }
}

async function main() {
  // Separate connections for Queue producers vs Workers (BullMQ recommendation).
  const queueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const workerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const emailQueue = new Queue('email-queue', { connection: queueConnection });
  const maintenanceQueue = new Queue('maintenance-queue', { connection: queueConnection });
  const documentQueue = new Queue('document-processing-queue', { connection: queueConnection });
  const imageQueue = new Queue('image-processing-queue', { connection: queueConnection });
  const analyticsQueue = new Queue('analytics-queue', { connection: queueConnection });

  const emailWorker = new Worker(
    'email-queue',
    async (job) => {
      if (job.name === 'password-reset') {
        await sendPasswordResetEmail(job.data as PasswordResetJob);
        return;
      }
      console.log(`[${service}-worker] email job ${job.id}`, job.name, job.data);
    },
    { connection: workerConnection, concurrency: 5 },
  );

  const maintenanceWorker = new Worker(
    'maintenance-queue',
    async (job) => {
      if (job.name === 'delete-asset') {
        await deleteCloudinaryAsset(job.data as DeleteAssetJob);
        return;
      }
      if (job.name === 'expire-stale-sessions') {
        await expireStaleSessions();
        return;
      }
      if (job.name === 'orphan-media-scan') {
        await orphanMediaScan(maintenanceQueue);
        return;
      }
      console.log(`[${service}-worker] maintenance job ${job.id}`, job.name, job.data);
    },
    { connection: workerConnection, concurrency: 2 },
  );

  const documentWorker = new Worker(
    'document-processing-queue',
    async (job) => {
      console.log(`[${service}-worker] document job ${job.id}`, job.name, job.data);
    },
    { connection: workerConnection, concurrency: 2 },
  );

  const imageWorker = new Worker(
    'image-processing-queue',
    async (job) => {
      console.log(`[${service}-worker] image job ${job.id}`, job.name, job.data);
    },
    { connection: workerConnection, concurrency: 2 },
  );

  const analyticsWorker = new Worker(
    'analytics-queue',
    async (job) => {
      console.log(`[${service}-worker] analytics job ${job.id}`, job.name, job.data);
    },
    { connection: workerConnection, concurrency: 2 },
  );

  for (const worker of [
    emailWorker,
    maintenanceWorker,
    documentWorker,
    imageWorker,
    analyticsWorker,
  ]) {
    worker.on('failed', (job, err) => {
      console.error(`[${service}-worker] ${job?.queueName} failed`, job?.id, err.message);
    });
  }

  console.log(`[${service}-worker] BullMQ workers online`);

  const shutdown = async (signal: string) => {
    console.log(`[${service}-worker] ${signal} — closing`);
    await Promise.all([
      emailWorker.close(),
      maintenanceWorker.close(),
      documentWorker.close(),
      imageWorker.close(),
      analyticsWorker.close(),
    ]);
    await Promise.all([
      emailQueue.close(),
      maintenanceQueue.close(),
      documentQueue.close(),
      imageQueue.close(),
      analyticsQueue.close(),
    ]);
    await queueConnection.quit();
    await workerConnection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
