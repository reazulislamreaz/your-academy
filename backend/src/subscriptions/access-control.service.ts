import { Injectable } from '@nestjs/common';
import {
  DocumentVisibility,
  SubscriptionStatus,
  UserRole,
  type User,
} from '@prisma/client';
import { Entitlement } from '@your-academy/shared';
import { PrismaService } from '../database/prisma.service';

export type AccessUser = Pick<
  User,
  'id' | 'role' | 'status' | 'trialStartedAt' | 'trialEndsAt'
>;

const ALWAYS_FREE: Entitlement[] = [
  Entitlement.BROWSE_QUESTIONS,
  Entitlement.VIEW_QUESTION_CONTENT,
  Entitlement.VIEW_OPTIONS,
  Entitlement.BOOKMARK,
  Entitlement.VIEW_NEWS,
  Entitlement.VIEW_DOCUMENTS,
];

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  isTrialActive(user: AccessUser, now = new Date()): boolean {
    return now >= user.trialStartedAt && now < user.trialEndsAt;
  }

  async hasActiveSubscription(userId: string, now = new Date()): Promise<boolean> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      select: { id: true },
    });
    return Boolean(sub);
  }

  async can(user: AccessUser, entitlement: Entitlement): Promise<boolean> {
    if (user.role === UserRole.ADMIN) return true;
    if (ALWAYS_FREE.includes(entitlement)) return true;

    if (
      entitlement === Entitlement.VIEW_ANSWERS ||
      entitlement === Entitlement.VIEW_EXPLANATIONS
    ) {
      if (this.isTrialActive(user)) return true;
      return this.hasActiveSubscription(user.id);
    }

    return false;
  }

  async canViewAnswers(user: AccessUser): Promise<boolean> {
    return this.can(user, Entitlement.VIEW_ANSWERS);
  }

  /**
   * DEC-001: AUTHENTICATED/PUBLIC docs stay available post-trial.
   * PREMIUM is reserved for trial/subscription (or admin).
   */
  async canAccessDocument(
    user: AccessUser,
    visibility: DocumentVisibility,
  ): Promise<boolean> {
    if (user.role === UserRole.ADMIN) return true;
    if (
      visibility === DocumentVisibility.PUBLIC ||
      visibility === DocumentVisibility.AUTHENTICATED
    ) {
      return true;
    }
    if (visibility === DocumentVisibility.PREMIUM) {
      if (this.isTrialActive(user)) return true;
      return this.hasActiveSubscription(user.id);
    }
    return false;
  }

  async getAccessSnapshot(user: AccessUser) {
    const now = new Date();
    const isTrialActive = this.isTrialActive(user, now);
    const hasActiveSubscription = await this.hasActiveSubscription(user.id, now);
    const premium = user.role === UserRole.ADMIN || isTrialActive || hasActiveSubscription;

    const entitlements: Entitlement[] = [...ALWAYS_FREE];
    if (premium) {
      entitlements.push(Entitlement.VIEW_ANSWERS, Entitlement.VIEW_EXPLANATIONS);
    }
    if (user.role === UserRole.ADMIN) {
      entitlements.push(Entitlement.MANAGE_CONTENT, Entitlement.VIEW_ADMIN_DASHBOARD);
    }

    return {
      trialStartedAt: user.trialStartedAt.toISOString(),
      trialEndsAt: user.trialEndsAt.toISOString(),
      isTrialActive,
      hasActiveSubscription,
      role: user.role,
      entitlements,
    };
  }

  stripAnswerFields<T extends { isCorrect?: boolean; explanation?: string | null }>(
    question: T,
    canView: boolean,
  ): T {
    if (canView) return question;
    const clone = { ...question };
    delete clone.isCorrect;
    delete clone.explanation;
    return clone;
  }
}
