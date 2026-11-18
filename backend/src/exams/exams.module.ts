import { Module } from '@nestjs/common';
import { AdminExamsController } from './admin-exams.controller';
import { ExamsService } from './exams.service';
import { PublicExamsController } from './public-exams.controller';

@Module({
  controllers: [AdminExamsController, PublicExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
