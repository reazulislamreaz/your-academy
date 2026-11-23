import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { StaffUsersService } from './staff-users.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, StaffUsersService],
})
export class AdminModule {}
