import { Module } from '@nestjs/common';
import { AdminModelTestsController } from './admin-model-tests.controller';
import { ModelTestsService } from './model-tests.service';
import { PublicModelTestsController } from './public-model-tests.controller';

@Module({
  controllers: [AdminModelTestsController, PublicModelTestsController],
  providers: [ModelTestsService],
  exports: [ModelTestsService],
})
export class ModelTestsModule {}
