export const REDIS_CONNECTION = 'REDIS_CONNECTION';
export const EMAIL_QUEUE = 'EMAIL_QUEUE';
export const MAINTENANCE_QUEUE = 'MAINTENANCE_QUEUE';
export const DOCUMENT_PROCESSING_QUEUE = 'DOCUMENT_PROCESSING_QUEUE';
export const IMAGE_PROCESSING_QUEUE = 'IMAGE_PROCESSING_QUEUE';
export const ANALYTICS_QUEUE = 'ANALYTICS_QUEUE';

export const DEFAULT_QUEUE_OPTIONS = {
  removeOnComplete: 100,
  removeOnFail: 200,
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 3000 },
};
