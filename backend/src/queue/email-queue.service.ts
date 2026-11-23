import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EMAIL_QUEUE } from './queue.constants';

export type PasswordResetEmailJob = {
  to: string;
  resetUrl: string;
  userId: string;
  /** Shown in the email copy; the API still enforces the token TTL. */
  expiresInMinutes: number;
};

export type EmailVerificationJob = {
  to: string;
  verifyUrl: string;
  userId: string;
  expiresInMinutes: number;
};

/** Sent to the previous address when an account's email is replaced. */
export type EmailChangedNoticeJob = {
  to: string;
  newEmailMasked: string;
  userId: string;
  changedBy: 'admin' | 'user';
};

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(@Inject(EMAIL_QUEUE) private readonly emailQueue: Queue) {}

  async enqueuePasswordReset(job: PasswordResetEmailJob, dedupeKey: string) {
    // BullMQ custom jobId cannot contain ':'
    await this.emailQueue.add('password-reset', job, {
      jobId: `password-reset-${dedupeKey}`,
    });
    this.logger.debug(`Enqueued password-reset for user ${job.userId}`);
  }

  async enqueueEmailVerification(job: EmailVerificationJob, dedupeKey: string) {
    await this.emailQueue.add('email-verification', job, {
      jobId: `email-verification-${dedupeKey}`,
    });
    this.logger.debug(`Enqueued email-verification for user ${job.userId}`);
  }

  async enqueueEmailChangedNotice(job: EmailChangedNoticeJob, dedupeKey: string) {
    await this.emailQueue.add('email-changed-notice', job, {
      jobId: `email-changed-notice-${dedupeKey}`,
    });
    this.logger.debug(`Enqueued email-changed-notice for user ${job.userId}`);
  }
}
