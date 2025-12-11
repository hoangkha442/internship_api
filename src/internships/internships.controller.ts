import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { RolesGuard } from 'src/auth/roles/roles.guard'
import { Roles } from 'src/auth/roles/roles.decorator'

import { InternshipsService } from './internships.service'
import { RegisterInternshipDto } from './dto/register-internship.dto'
import { UpdateInternshipStatusDto } from './dto/update-internship-status.dto'
import { CreateTermDto } from './dto/create-term.dto'
import { CreateTopicDto } from './dto/create-topic.dto'

@ApiTags('Internships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('internships')
export class InternshipsController {
  constructor(private readonly service: InternshipsService) {}

  // ====================== STUDENT ======================

  @Post('register')
  @Roles('student')
  register(@Req() req: any, @Body() dto: RegisterInternshipDto) {
    return this.service.registerInternship(req.user.userId, dto)
  }

  @Get('my')
  @Roles('student')
  getMyInternship(@Req() req: any) {
    return this.service.getMyInternship(req.user.userId)
  }

  @Get('my-progress')
  @Roles('student')
  myProgress(@Req() req: any) {
    return this.service.getMyProgress(req.user.userId)
  }

  // ====================== LECTURER ======================

  @Get('lecturer/students')
  @Roles('lecturer')
  supervised(@Req() req: any) {
    return this.service.getSupervisedStudents(req.user.userId)
  }

  @Patch('status/:id')
  @Roles('lecturer')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInternshipStatusDto) {
    return this.service.updateStatus(req.user.userId, id, dto)
  }

  // ====================== ADMIN ======================

  @Post('terms')
  @Roles('admin')
  createTerm(@Body() dto: CreateTermDto) {
    return this.service.createTerm(dto)
  }

  @Post('topics')
  @Roles('lecturer')
  createTopic(@Req() req: any, @Body() dto: CreateTopicDto) {
    return this.service.createTopic(req.user.userId, dto)
  }

  @Get()
  @Roles('admin')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Trang (bắt đầu từ 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số bản ghi mỗi trang',
  })
  getAllInternships(@Query('page') page?: any, @Query('limit') limit?: any) {
    return this.service.getAllInternships(page, limit);
  }


  @Get('/terms')
  @Roles('admin')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Trang (bắt đầu từ 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Số bản ghi mỗi trang',
  })
  getAllInternshipTerms(@Query('page') page?: any, @Query('limit') limit?: any) {
    return this.service.getAllInternshipTerms(page, limit);
  }
}
