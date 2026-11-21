import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TopicImportController } from './topic-import.controller';
import { TopicImportService } from './topic-import.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TopicImportController],
  providers: [TopicImportService],
  exports: [TopicImportService],
})
export class TopicImportModule {}
