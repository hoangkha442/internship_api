// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Query,
//   Req,
//   UseGuards,
//   UseInterceptors,
//   UploadedFiles,
// } from '@nestjs/common';
// import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
// import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { RolesGuard } from 'src/auth/roles/roles.guard';
// import { Roles } from 'src/auth/roles/roles.decorator';
// import { FilesInterceptor } from '@nestjs/platform-express';
// import { memoryStorage } from 'multer';

// import { ProgressReportService } from './progress-report.service';
// import { CreateReportDto } from './dto/create-report.dto';
// import { UpdateReportDto } from './dto/update-report.dto';
// import { ReviewReportDto } from './dto/review-report.dto';

// @ApiTags('Progress Reports')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('reports')
// export class ProgressReportController {
//   constructor(private readonly reportService: ProgressReportService) {}

//   // GET /reports/student?internship_id=7&page=1&limit=10
//   @Get('student')
//   @Roles('student')
//   @ApiQuery({ name: 'internship_id', required: true, type: Number })
//   @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
//   @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
//   getStudentReports(
//     @Req() req: any,
//     @Query('internship_id') internshipId: string,
//     @Query('page') page?: any,
//     @Query('limit') limit?: any,
//   ) {
//     return this.reportService.getStudentReports(
//       req.user.userId,
//       internshipId,
//       page,
//       limit,
//     );
//   }

//   // POST /reports/student (multipart)
//   @Post('student')
//   @Roles('student')
//   @ApiConsumes('multipart/form-data')
//   @UseInterceptors(
//     FilesInterceptor('attachments', 10, {
//       storage: memoryStorage(),
//       limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
//     }),
//   )
//   createStudentReport(
//     @Req() req: any,
//     @Body() dto: CreateReportDto,
//     @UploadedFiles() files: Express.Multer.File[],
//   ) {
//     return this.reportService.createStudentReport(req.user.userId, dto, files);
//   }

//   // PATCH /reports/student/:id (multipart optional)
//   @Patch('student/:id')
//   @Roles('student')
//   @ApiConsumes('multipart/form-data')
//   @UseInterceptors(
//     FilesInterceptor('attachments', 10, {
//       storage: memoryStorage(),
//       limits: { fileSize: 25 * 1024 * 1024 },
//     }),
//   )
//   updateStudentReport(
//     @Req() req: any,
//     @Param('id') id: string,
//     @Body() dto: UpdateReportDto,
//     @UploadedFiles() files: Express.Multer.File[],
//   ) {
//     return this.reportService.updateStudentReport(req.user.userId, id, dto, files);
//   }

//   @Delete('student/:id')
//   @Roles('student')
//   deleteStudentReport(@Req() req: any, @Param('id') id: string) {
//     return this.reportService.deleteStudentReport(req.user.userId, id);
//   }

//   // GET /reports/lecturer?internship_id=7&page=1&limit=10
//   @Get('lecturer')
//   @Roles('lecturer')
//   @ApiQuery({ name: 'internship_id', required: true, type: Number })
//   @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
//   @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
//   getLecturerReports(
//     @Req() req: any,
//     @Query('internship_id') internshipId: string,
//     @Query('page') page?: any,
//     @Query('limit') limit?: any,
//   ) {
//     return this.reportService.getLecturerReports(
//       req.user.userId,
//       internshipId,
//       page,
//       limit,
//     );
//   }

//   // PATCH /reports/lecturer/:id/review
//   @Patch('lecturer/:id/review')
//   @Roles('lecturer')
//   reviewReport(
//     @Req() req: any,
//     @Param('id') id: string,
//     @Body() dto: ReviewReportDto,
//   ) {
//     return this.reportService.reviewReport(req.user.userId, id, dto);
//   }

//   // ADMIN: GET /reports/admin?status=needs_revision&term_id=1&page=1&limit=20
//   @Get('admin')
//   @Roles('admin')
//   @ApiQuery({ name: 'status', required: false })
//   @ApiQuery({ name: 'term_id', required: false, type: Number })
//   @ApiQuery({ name: 'lecturer_id', required: false, type: Number })
//   @ApiQuery({ name: 'student_id', required: false, type: Number })
//   @ApiQuery({ name: 'internship_id', required: false, type: Number })
//   @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
//   @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
//   getAdminReports(
//     @Query('status') status?: string,
//     @Query('term_id') termId?: string,
//     @Query('lecturer_id') lecturerId?: string,
//     @Query('student_id') studentId?: string,
//     @Query('internship_id') internshipId?: string,
//     @Query('page') page?: any,
//     @Query('limit') limit?: any,
//   ) {
//     return this.reportService.getAdminReports({
//       status,
//       termId,
//       lecturerId,
//       studentId,
//       internshipId,
//       page,
//       limit,
//     });
//   }
// }

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ProgressReportService } from './progress-report.service';
import { CreateProgressReportDto } from 'src/progress-report/dto/create-report.dto';
import { UpdateProgressReportDto } from 'src/progress-report/dto/update-report.dto';
import { ReviewProgressReportDto } from 'src/progress-report/dto/review-report.dto';

@ApiTags('ProgressReports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('progress-reports')
export class ProgressReportController {
  constructor(private readonly service: ProgressReportService) {}

  // GET /progress-reports/student?internship_id=6&page=1&limit=10
  @Get('student')
  @Roles('student')
  @ApiQuery({ name: 'internship_id', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getStudentReports(
    @Req() req: any,
    @Query('internship_id') internshipId: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.getStudentReports(req.user.userId, internshipId, page, limit);
  }

  // POST /progress-reports/student (multipart)
  @Post('student')
  @Roles('student')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  createStudentReport(
    @Req() req: any,
    @Body() dto: CreateProgressReportDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.createStudentReport(req.user.userId, dto, files);
  }

  // PATCH /progress-reports/student/:id
  @Patch('student/:id')
  @Roles('student')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  updateStudentReport(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProgressReportDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.updateStudentReport(req.user.userId, id, dto, files);
  }

  @Delete('student/:id')
  @Roles('student')
  deleteStudentReport(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteStudentReport(req.user.userId, id);
  }

  // Lecturer list by internship
  @Get('lecturer')
  @Roles('lecturer')
  @ApiQuery({ name: 'internship_id', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLecturerReports(
    @Req() req: any,
    @Query('internship_id') internshipId: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.getLecturerReports(req.user.userId, internshipId, page, limit);
  }

  @Patch('lecturer/:id/review')
  @Roles('lecturer')
  reviewReport(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewProgressReportDto,
  ) {
    return this.service.reviewReport(req.user.userId, id, dto);
  }
}
