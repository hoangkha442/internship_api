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
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

import { AttendanceService } from './attendance.service';
import { AttendanceLocationDto } from './dto/attendance-location.dto';
import { RequestLeaveDto } from './dto/request-leave.dto';
import { CreateAllowedNetworkDto, UpdateAllowedNetworkDto } from './dto/admin-network.dto';
import { attendance_records_status } from '@prisma/client';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // ========================= STUDENT =========================

  @Get('student/today')
  @Roles('student')
  studentToday(@Req() req: any) {
    return this.service.studentToday(req);
  }

  @Get('student/history')
  @Roles('student')
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  studentHistory(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.studentHistory(req, from, to, page, limit);
  }

  @Post('student/check-in')
  @Roles('student')
  studentCheckIn(@Req() req: any, @Body() dto: AttendanceLocationDto) {
    return this.service.studentCheckIn(req, dto);
  }

  @Post('student/check-out')
  @Roles('student')
  studentCheckOut(@Req() req: any, @Body() dto: AttendanceLocationDto) {
    return this.service.studentCheckOut(req, dto);
  }

  @Post('student/request-leave')
  @Roles('student')
  requestLeave(@Req() req: any, @Body() dto: RequestLeaveDto) {
    return this.service.studentRequestLeave(req, dto);
  }

  // ========================= LECTURER =========================

  @Get('lecturer/list')
  @Roles('lecturer')
  @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD (nếu muốn xem 1 ngày)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  lecturerList(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.lecturerList(req, date, from, to, page, limit);
  }

  @Get('lecturer/pending-requests')
  @Roles('lecturer')
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  lecturerPendingRequests(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.lecturerPendingRequests(req, from, to, page, limit);
  }

  @Patch('lecturer/:id/approve')
  @Roles('lecturer')
  approve(@Req() req: any, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.service.lecturerApprove(req, id, body);
  }

  @Patch('lecturer/:id/reject')
  @Roles('lecturer')
  reject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { rejection_reason: string; note?: string },
  ) {
    return this.service.lecturerReject(req, id, body);
  }

  // ========================= ADMIN =========================

  @Get('admin/list')
  @Roles('admin')
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: attendance_records_status })
  @ApiQuery({ name: 'lecturer_id', required: false, type: String })
  @ApiQuery({ name: 'student_id', required: false, type: String })
  @ApiQuery({ name: 'class_id', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  adminList(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: attendance_records_status,
    @Query('lecturer_id') lecturer_id?: string,
    @Query('student_id') student_id?: string,
    @Query('class_id') class_id?: string,
    @Query('page') page?: any,
    @Query('limit') limit?: any,
  ) {
    return this.service.adminListAll(req, {
      from,
      to,
      status,
      lecturer_id,
      student_id,
      class_id,
      page,
      limit,
    });
  }

  // --- allowed networks ---
  @Get('admin/networks')
  @Roles('admin')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getNetworks(@Query('page') page?: any, @Query('limit') limit?: any) {
    return this.service.adminGetNetworks(page, limit);
  }

  @Post('admin/networks')
  @Roles('admin')
  createNetwork(@Body() dto: CreateAllowedNetworkDto) {
    return this.service.adminCreateNetwork(dto);
  }

  @Patch('admin/networks/:id')
  @Roles('admin')
  updateNetwork(@Param('id') id: string, @Body() dto: UpdateAllowedNetworkDto) {
    return this.service.adminUpdateNetwork(id, dto);
  }

  @Delete('admin/networks/:id')
  @Roles('admin')
  deleteNetwork(@Param('id') id: string) {
    return this.service.adminDeleteNetwork(id);
  }
}
