import { IsIn, IsOptional, IsString } from "class-validator";

export type DashboardRange = "7d" | "14d" | "30d";

export class GetStudentDashboardDto {
  @IsOptional()
  @IsIn(["7d", "14d", "30d"])
  range?: DashboardRange;

  // ISO string
  @IsOptional()
  @IsString()
  from?: string;

  // ISO string
  @IsOptional()
  @IsString()
  to?: string;

  // nếu muốn cho chọn internship khác (nếu student có nhiều internship)
  @IsOptional()
  @IsString()
  internship_id?: string;
}
