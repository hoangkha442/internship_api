import { Module } from '@nestjs/common';
import { ProgressReportController } from './progress-report.controller';
import { ProgressReportService } from './progress-report.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  controllers: [ProgressReportController],
  providers: [ProgressReportService, CloudinaryService],
  exports: [ProgressReportService],
})
export class ProgressReportModule {}
