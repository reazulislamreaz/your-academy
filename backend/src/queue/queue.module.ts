import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { EmailQueueService } from './email-queue.service';
import { EMAIL_QUEUE, REDIS_CONNECTION } from './queue.constants';

export { EMAIL_QUEUE, REDIS_CONNECTION } from './queue.constants';

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
      useFactory: (connection: IORedis) =>
        new Queue('email-queue', {
          connection,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 200,
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
          },
        }),
    },
    EmailQueueService,
  ],
  exports: [EmailQueueService, EMAIL_QUEUE, REDIS_CONNECTION],
})
export class QueueModule {}
