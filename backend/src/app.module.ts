import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { CategoriesModule } from './categories/categories.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AppThrottlerGuard, isContentPath } from './common/guards/app-throttler.guard';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { ExamsModule } from './exams/exams.module';
import { ModelTestsModule } from './model-tests/model-tests.module';
import { HealthModule } from './health/health.module';
import { HomepageModule } from './homepage/homepage.module';
import { LearningActivityModule } from './learning-activity/learning-activity.module';
import { NewsModule } from './news/news.module';
import { PracticeModule } from './practice/practice.module';
import { QuestionImportModule } from './question-import/question-import.module';
import { TopicImportModule } from './topic-import/topic-import.module';
import { WrittenImportModule } from './written-import/written-import.module';
import { PublicModule } from './public/public.module';
import { QueueModule } from './queue/queue.module';
import { QuestionsModule } from './questions/questions.module';
import { StorageModule } from './storage/storage.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AdminSubscriptionsModule } from './subscriptions/admin-subscriptions.module';
import { SocialLinksModule } from './social-links/social-links.module';
import { SupportModule } from './support/support.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_SECONDS ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
      {
        // Bulk-scraping budget: question/exam content requests per user (or guest IP)
        // over 10 minutes. Normal study stays far below it.
        name: 'content',
        ttl: 10 * 60 * 1000,
        limit: Number(process.env.CONTENT_RATE_LIMIT_PER_10_MIN ?? 300),
        skipIf: (ctx) => {
          const req = ctx.switchToHttp().getRequest<{ originalUrl?: string; url?: string }>();
          return !isContentPath((req.originalUrl ?? req.url ?? '').split('?')[0]);
        },
      },
    ]),
    DatabaseModule,
    QueueModule,
    AuditModule,
    LearningActivityModule,
    SubscriptionsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    QuestionsModule,
    PracticeModule,
    QuestionImportModule,
    TopicImportModule,
    WrittenImportModule,
    BookmarksModule,
    NewsModule,
    HomepageModule,
    SocialLinksModule,
    DocumentsModule,
    ExamsModule,
    ModelTestsModule,
    PublicModule,
    AnalyticsModule,
    AdminModule,
    AdminSubscriptionsModule,
    StorageModule,
    SupportModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
