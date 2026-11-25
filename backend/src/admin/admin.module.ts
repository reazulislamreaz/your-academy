import { AdminMonitoringController } from './admin-monitoring.controller';
import { AdminMonitoringService } from './admin-monitoring.service';
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminPasswordResetService } from './admin-password-reset.service';
import { AdminUserSessionsService } from './admin-user-sessions.service';
import { AdminService } from './admin.service';
import { StaffUsersService } from './staff-users.service';

@Module({
  controllers: [AdminController, AdminMonitoringController],
  providers: [
    AdminService,
    StaffUsersService,
    AdminPasswordResetService,
    AdminUserSessionsService,
    AdminMonitoringService,
  ],
})
export class AdminModule {}
