import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuestionImportController } from './question-import.controller';
import { QuestionImportService } from './question-import.service';

@Module({
  imports: [AuthModule],
  controllers: [QuestionImportController],
  providers: [QuestionImportService],
  exports: [QuestionImportService],
})
export class QuestionImportModule {}
