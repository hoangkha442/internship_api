// import {
//   Body,
//   Controller,
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
// import { FilesInterceptor } from '@nestjs/platform-express';

// import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { RolesGuard } from 'src/auth/roles/roles.guard';
// import { Roles } from 'src/auth/roles/roles.decorator';

// import { WorklogService } from './worklog.service';
// import { CreateWorkLogDto } from './dto/create-worklog.dto';
// import { UpdateWorkLogDto } from './dto/update-worklog.dto';

// @ApiTags('Worklogs')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('worklogs')
// export class WorklogController {
//   constructor(private readonly worklogService: WorklogService) {}

//   @Get('student')
//   @Roles('student')
//   @ApiQuery({ name: 'internship_id', required: true, type: Number })
//   @ApiQuery({ name: 'page', required: false, type: Number })
//   @ApiQuery({ name: 'limit', required: false, type: Number })
//   getStudentWorkLogs(
//     @Req() req: any,
//     @Query('internship_id') internshipId: string,
//     @Query('page') page?: any,
//     @Query('limit') limit?: any,
//   ) {
//     return this.worklogService.getStudentWorkLogs(req.user.userId, internshipId, page, limit);
//   }

//   @Post('student')
//   @Roles('student')
//   @ApiConsumes('multipart/form-data')
//   @UseInterceptors(FilesInterceptor('attachments', 10))
//   createStudentWorkLog(
//     @Req() req: any,
//     @Body() dto: CreateWorkLogDto,
//     @UploadedFiles() files: Array<Express.Multer.File>,
//   ) {
//     return this.worklogService.createStudentWorkLog(req.user.userId, dto, files);
//   }

//   @Patch('student/:id')
//   @Roles('student')
//   @ApiConsumes('multipart/form-data')
//   @UseInterceptors(FilesInterceptor('attachments', 10))
//   updateStudentWorkLog(
//     @Req() req: any,
//     @Param('id') id: string,
//     @Body() dto: UpdateWorkLogDto,
//     @UploadedFiles() files: Array<Express.Multer.File>,
//   ) {
//     return this.worklogService.updateStudentWorkLog(req.user.userId, id, dto, files);
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

import { WorklogService } from './worklog.service';
import { CreateWorkLogDto } from './dto/create-worklog.dto';
import { UpdateWorkLogDto } from './dto/update-worklog.dto';
import { ReviewWorklogDto } from 'src/worklog/dto/review-worklog.dto';

@ApiTags('Worklogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('worklogs')
export class WorklogController {
  constructor(private readonly worklogService: WorklogService) {}

  // GET /worklogs/student?internship_id=7&page=1&limit=10
  @Get('student')
  @Roles('student')
  @ApiQuery({ name: 'internship_id', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getStudentWorkLogs(
    @Req() req: any,
    @Query('internship_id') internshipId: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.worklogService.getStudentWorkLogs(
      req.user.userId,
      internshipId,
      page,
      limit,
    );
  }

  // POST /worklogs/student (multipart)
  @Post('student')
  @Roles('student')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  createStudentWorkLog(
    @Req() req: any,
    @Body() dto: CreateWorkLogDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.worklogService.createStudentWorkLog(
      req.user.userId,
      dto,
      files,
    );
  }

  // PATCH /worklogs/student/:id (multipart optional)
  @Patch('student/:id')
  @Roles('student')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  updateStudentWorkLog(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkLogDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.worklogService.updateStudentWorkLog(
      req.user.userId,
      id,
      dto,
      files,
    );
  }

  @Delete('student/:id')
  @Roles('student')
  deleteStudentWorkLog(@Req() req: any, @Param('id') id: string) {
    return this.worklogService.deleteStudentWorkLog(req.user.userId, id);
  }

  @Get('lecturer')
  @Roles('lecturer')
  @ApiQuery({ name: 'internship_id', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLecturerWorklogs(
    @Req() req: any,
    @Query('internship_id') internshipId: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.worklogService.getLecturerWorklogs(
      req.user.userId,
      internshipId,
      page,
      limit,
    );
  }

  @Patch('lecturer/:id/review')
  @Roles('lecturer')
  reviewWorklog(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewWorklogDto,
  ) {
    return this.worklogService.reviewWorklog(req.user.userId, id, dto);
  }
}
