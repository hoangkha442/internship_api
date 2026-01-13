import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { LecturerDashboardService } from "./lecturer-dashboard.service";
import { LecturerDashboardQueryDto } from "./dto/lecturer-dashboard-query.dto";
import { RolesGuard } from "src/auth/roles/roles.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/auth/roles/roles.decorator";


@Controller("lecturer-dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("lecturer")
export class LecturerDashboardController {
  constructor(private readonly service: LecturerDashboardService) {}

  private getUserId(req: any): string {
    // tuỳ project bạn lưu key nào
    const id = req?.user?.id ?? req?.user?.userId ?? req?.user?.sub;
    return String(id);
  }

  @Get()
  async dashboard(@Req() req: any, @Query() query: LecturerDashboardQueryDto) {
    const userId = this.getUserId(req);
    const data = await this.service.getDashboard(userId, query);
    return { data };
  }

  @Get("summary")
  async summary(@Req() req: any, @Query() query: LecturerDashboardQueryDto) {
    const userId = this.getUserId(req);
    const data = await this.service.getSummary(userId, query);
    return { data };
  }

  @Get("trends/reports")
  async reportTrends(@Req() req: any, @Query() query: LecturerDashboardQueryDto) {
    const userId = this.getUserId(req);
    const data = await this.service.getReportTrends(userId, query);
    return { data };
  }

  @Get("trends/attendance")
  async attendanceTrends(@Req() req: any, @Query() query: LecturerDashboardQueryDto) {
    const userId = this.getUserId(req);
    const data = await this.service.getAttendanceTrends(userId, query);
    return { data };
  }

  @Get("trends/worklogs")
  async worklogTrends(@Req() req: any, @Query() query: LecturerDashboardQueryDto) {
    const userId = this.getUserId(req);
    const data = await this.service.getWorklogTrends(userId, query);
    return { data };
  }
}
