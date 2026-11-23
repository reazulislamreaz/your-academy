import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminPasswordResetService } from './admin-password-reset.service';
import { AdminUserSessionsService } from './admin-user-sessions.service';
import { AdminService } from './admin.service';
import { StaffUsersService } from './staff-users.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, StaffUsersService, AdminPasswordResetService, AdminUserSessionsService],
})
export class AdminModule {}
