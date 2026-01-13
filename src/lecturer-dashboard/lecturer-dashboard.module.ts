import { Module } from '@nestjs/common';
import { LecturerDashboardService } from './lecturer-dashboard.service';
import { LecturerDashboardController } from './lecturer-dashboard.controller';

@Module({
  controllers: [LecturerDashboardController],
  providers: [LecturerDashboardService],
})
export class LecturerDashboardModule {}
