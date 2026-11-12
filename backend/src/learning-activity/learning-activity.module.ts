import { Global, Module } from '@nestjs/common';
import { LearningActivityService } from './learning-activity.service';

@Global()
@Module({
  providers: [LearningActivityService],
  exports: [LearningActivityService],
})
export class LearningActivityModule {}
