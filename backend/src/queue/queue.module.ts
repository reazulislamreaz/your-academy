import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { EmailQueueService } from './email-queue.service';
import { MaintenanceQueueService } from './maintenance-queue.service';
import {
  ANALYTICS_QUEUE,
  DEFAULT_QUEUE_OPTIONS,
  DOCUMENT_PROCESSING_QUEUE,
  EMAIL_QUEUE,
  IMAGE_PROCESSING_QUEUE,
  MAINTENANCE_QUEUE,
  REDIS_CONNECTION,
} from './queue.constants';

export {
  ANALYTICS_QUEUE,
  DOCUMENT_PROCESSING_QUEUE,
  EMAIL_QUEUE,
  IMAGE_PROCESSING_QUEUE,
  MAINTENANCE_QUEUE,
  REDIS_CONNECTION,
} from './queue.constants';

function createQueue(name: string, connection: IORedis) {
  return new Queue(name, {
    connection,
    defaultJobOptions: { ...DEFAULT_QUEUE_OPTIONS },
  });
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      useFactory: () => {
        const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: EMAIL_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) => createQueue('email-queue', connection),
    },
    {
      provide: MAINTENANCE_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) => createQueue('maintenance-queue', connection),
    },
    {
      provide: DOCUMENT_PROCESSING_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) => createQueue('document-processing-queue', connection),
    },
    {
      provide: IMAGE_PROCESSING_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) => createQueue('image-processing-queue', connection),
    },
    {
      provide: ANALYTICS_QUEUE,
      inject: [REDIS_CONNECTION],
      useFactory: (connection: IORedis) => createQueue('analytics-queue', connection),
    },
    EmailQueueService,
    MaintenanceQueueService,
  ],
  exports: [
    EmailQueueService,
    MaintenanceQueueService,
    EMAIL_QUEUE,
    MAINTENANCE_QUEUE,
    DOCUMENT_PROCESSING_QUEUE,
    IMAGE_PROCESSING_QUEUE,
    ANALYTICS_QUEUE,
    REDIS_CONNECTION,
  ],
})
export class QueueModule implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    @Inject(EMAIL_QUEUE) private readonly emailQueue: Queue,
    @Inject(MAINTENANCE_QUEUE) private readonly maintenanceQueue: Queue,
    @Inject(DOCUMENT_PROCESSING_QUEUE) private readonly documentQueue: Queue,
    @Inject(IMAGE_PROCESSING_QUEUE) private readonly imageQueue: Queue,
    @Inject(ANALYTICS_QUEUE) private readonly analyticsQueue: Queue,
  ) {}

  async onModuleDestroy() {
    await Promise.all([
      this.emailQueue.close(),
      this.maintenanceQueue.close(),
      this.documentQueue.close(),
      this.imageQueue.close(),
      this.analyticsQueue.close(),
    ]);
    await this.redis.quit();
  }
}
