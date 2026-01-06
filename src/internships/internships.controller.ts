import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

import { InternshipsService } from './internships.service';

import { CreateTermDto } from './dto/create-term.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateInternshipStatusDto } from './dto/update-internship-status.dto';

import { CreateTopicRegistrationDto } from './dto/create-topic-registration.dto';
import { ApproveRegistrationDto } from './dto/approve-registratio.dto';
import { RejectRegistrationDto } from './dto/reject-registratio.dto';

@ApiTags('Internships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('internships')
export class InternshipsController {
  constructor(private readonly service: InternshipsService) {}

  // ====================== STUDENT ======================

  @Get('student/internship-topics')
  @Roles('student')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getInternshipTopics(@Query('page') page?: any, @Query('limit') limit?: any) {
    return this.service.getInternshipTopics(page, limit);
  }

  @Post('topic-registrations')
  @Roles('student')
  registerTopic(@Req() req: any, @Body() dto: CreateTopicRegistrationDto) {
    // userId là users.id (đã lấy từ JWT)
    return this.service.createTopicRegistration(req.user.userId, dto);
  }

  @Get('my-progress')
  @Roles('student')
  myProgress(@Req() req: any) {
    return this.service.getMyProgress(req.user.userId);
  }

  @Get('student/my-topic-registration')
  @Roles('student')
  getMyTopicRegistration(@Req() req: any) {
    return this.service.getMyTopicRegistration(req.user.userId);
  }

  @Get('my')
  @Roles('student')
  getMyInternship(@Req() req: any) {
    return this.service.getMyInternship(req.user.userId);
  }

  // ====================== LECTURER ======================

  // @Get('lecturer/students')
  // @Roles('lecturer')
  // @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  // @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  // getSupervisedStudents(
  //   @Req() req: any,
  //   @Query('page') page?: any,
  //   @Query('limit') limit?: any,
  // ) {
  //   return this.service.getSupervisedStudents(req.user.userId, page, limit);
  // }

  @Get('lecturer/students')
  @Roles('lecturer')
  @ApiQuery({ name: 'term_id', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['registered', 'in_progress', 'completed', 'dropped'],
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getSupervisedStudents(
    @Req() req: any,
    @Query('term_id') termId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.getSupervisedStudents(req.user.userId, {
      termId,
      status,
      q,
      page: Number(page ?? 1),
      limit: Number(limit ?? 10),
    });
  }

  @Patch('status/:id')
  @Roles('lecturer')
  updateStatus(
    @Req() req: any,
    @Param('id') internshipId: string,
    @Body() dto: UpdateInternshipStatusDto,
  ) {
    return this.service.updateStatus(req.user.userId, internshipId, dto);
  }

  @Get('lecturer/topic-registrations')
  @Roles('lecturer')
  @ApiQuery({ name: 'topic_id', type: Number, required: true })
  getPendingRegistrations(@Req() req: any, @Query('topic_id') topicId: string) {
    return this.service.getPendingRegistrations(req.user.userId, topicId);
  }

  @Patch('lecturer/topic-registrations/approve/:id')
  @Roles('lecturer')
  approveRegistration(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveRegistrationDto,
  ) {
    return this.service.approveTopicRegistration(req.user.userId, id, dto);
  }

  @Patch('lecturer/topic-registrations/reject/:id')
  @Roles('lecturer')
  rejectRegistration(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
  ) {
    return this.service.rejectTopicRegistration(req.user.userId, id, dto);
  }

  // ====================== ADMIN ======================

  @Post('terms')
  @Roles('admin')
  createTerm(@Body() dto: CreateTermDto) {
    return this.service.createTerm(dto);
  }

  @Post('topics')
  @Roles('lecturer')
  createTopic(@Req() req: any, @Body() dto: CreateTopicDto) {
    return this.service.createTopic(req.user.userId, dto);
  }

  @Get()
  @Roles('admin', 'lecturer')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getAllInternships(@Query('page') page?: any, @Query('limit') limit?: any) {
    return this.service.getAllInternships(page, limit)
  }

  @Get('terms')
  @Roles('admin', 'lecturer')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getAllInternshipTerms(
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.getAllInternshipTerms(page, limit);
  }
  @Get('terms/:termId/topics')
  @Roles('admin')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getTopicsByTermForAdmin(
    @Param('termId') termId: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.getTopicsByTerm(termId, page, limit);
  }

  @Get('lecturer/terms/:termId/topics')
  @Roles('lecturer')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getTopicsByTermForLecturer(
    @Req() req: any,
    @Param('termId') termId: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.getMyTopicsByTerm(req.user.userId, termId, page, limit);
  }
}
