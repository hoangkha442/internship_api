import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceAutoAbsentJob } from 'src/attendance/attendance.auto-absent.job';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceAutoAbsentJob],
})
export class AttendanceModule {}
