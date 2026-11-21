import { Module } from '@nestjs/common';
import { ModelTestsModule } from '../model-tests/model-tests.module';
import { AdminExamsController } from './admin-exams.controller';
import { ExamsService } from './exams.service';
import { MeTimedAttemptsController } from './me-timed-attempts.controller';
import { PublicExamsController } from './public-exams.controller';

@Module({
  imports: [ModelTestsModule],
  controllers: [AdminExamsController, PublicExamsController, MeTimedAttemptsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
