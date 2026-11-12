import { Injectable, Logger } from '@nestjs/common';
import { LearningActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type LearningActivityInput = {
  userId: string;
  type: LearningActivityType;
  subjectCategoryId?: string | null;
  topicCategoryId?: string | null;
  questionId?: string | null;
  practiceSetId?: string | null;
  practiceAttemptId?: string | null;
  meta?: Prisma.InputJsonValue;
  occurredAt?: Date;
};

/** Online = ACTIVE browsing session with heartbeat within this window (3× 30s heartbeat). */
export const ONLINE_HEARTBEAT_WINDOW_MS = 90_000;

@Injectable()
export class LearningActivityService {
  private readonly logger = new Logger(LearningActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: LearningActivityInput): Promise<void> {
    try {
      await this.prisma.learningActivityEvent.create({
        data: {
          userId: input.userId,
          type: input.type,
          subjectCategoryId: input.subjectCategoryId ?? null,
          topicCategoryId: input.topicCategoryId ?? null,
          questionId: input.questionId ?? null,
          practiceSetId: input.practiceSetId ?? null,
          practiceAttemptId: input.practiceAttemptId ?? null,
          meta: input.meta ?? {},
          ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write learning activity: ${String(err)}`);
    }
  }

  onlineSince(now = new Date()): Date {
    return new Date(now.getTime() - ONLINE_HEARTBEAT_WINDOW_MS);
  }
}
