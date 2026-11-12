import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [DocumentsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
