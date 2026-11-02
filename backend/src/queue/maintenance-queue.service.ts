import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MAINTENANCE_QUEUE } from './queue.constants';

export type DeleteAssetJob = {
  mediaAssetId: string;
  publicId: string;
  resourceType: 'image' | 'raw';
};

@Injectable()
export class MaintenanceQueueService implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceQueueService.name);

  constructor(@Inject(MAINTENANCE_QUEUE) private readonly maintenanceQueue: Queue) {}

  async onModuleInit() {
    await this.maintenanceQueue.upsertJobScheduler(
      'repeat-expire-stale-sessions',
      { every: 5 * 60_000 },
      { name: 'expire-stale-sessions', data: {} },
    );
    await this.maintenanceQueue.upsertJobScheduler(
      'repeat-orphan-media-scan',
      { every: 60 * 60_000 },
      { name: 'orphan-media-scan', data: {} },
    );
    this.logger.log('Registered repeatable maintenance job schedulers');
  }

  async enqueueDeleteAsset(job: DeleteAssetJob) {
    await this.maintenanceQueue.add('delete-asset', job, {
      jobId: `delete-asset-${job.mediaAssetId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
    });
    this.logger.debug(`Enqueued delete-asset for ${job.mediaAssetId}`);
  }
}
