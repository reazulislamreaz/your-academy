import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { CategoriesModule } from './categories/categories.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { NewsModule } from './news/news.module';
import { PracticeModule } from './practice/practice.module';
import { PublicModule } from './public/public.module';
import { QueueModule } from './queue/queue.module';
import { QuestionsModule } from './questions/questions.module';
import { StorageModule } from './storage/storage.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_SECONDS ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    DatabaseModule,
    QueueModule,
    AuditModule,
    SubscriptionsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    QuestionsModule,
    PracticeModule,
    BookmarksModule,
    NewsModule,
    DocumentsModule,
    PublicModule,
    AnalyticsModule,
    AdminModule,
    StorageModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
