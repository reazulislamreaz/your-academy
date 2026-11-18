import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WrittenImportController } from './written-import.controller';
import { WrittenImportService } from './written-import.service';

@Module({
  imports: [AuthModule],
  controllers: [WrittenImportController],
  providers: [WrittenImportService],
  exports: [WrittenImportService],
})
export class WrittenImportModule {}
