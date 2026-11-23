import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PracticeModule } from '../practice/practice.module';
import { StorageModule } from '../storage/storage.module';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationService } from './email-verification.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, StorageModule, forwardRef(() => PracticeModule)],
  controllers: [UsersController, EmailVerificationController],
  providers: [UsersService, EmailVerificationService],
  exports: [UsersService],
})
export class UsersModule {}
