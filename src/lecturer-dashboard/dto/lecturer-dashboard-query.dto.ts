import { IsIn, IsOptional, IsString } from "class-validator";

export class LecturerDashboardQueryDto {
  @IsOptional()
  @IsString()
  term_id?: string;

  @IsOptional()
  @IsString()
  internship_id?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  /**
   */
  @IsOptional()
  @IsIn(["7d", "14d", "30d"])
  range?: "7d" | "14d" | "30d";
}
