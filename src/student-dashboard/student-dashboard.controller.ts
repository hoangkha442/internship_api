import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { StudentDashboardService } from "./student-dashboard.service";
import { GetStudentDashboardDto } from "./dto/get-student-dashboard.dto";
import { RolesGuard } from "src/auth/roles/roles.guard";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/auth/roles/roles.decorator";


@Controller("student-dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentDashboardController {
  constructor(private service: StudentDashboardService) {}

  @Get()
  @Roles("student")
  async getDashboard(@Req() req: any, @Query() dto: GetStudentDashboardDto) {
    return this.service.getDashboard(req.user.userId, dto);
  }
}
