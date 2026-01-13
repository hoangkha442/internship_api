import { IsNotEmpty, IsOptional, IsString, IsNumberString } from 'class-validator';

export class CreateProgressReportDto {
  @IsNumberString()
  internship_id: string;

  @IsOptional()
  report_no?: number;

  @IsOptional()
  week_no?: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  // HTML string (rich text)
  @IsString()
  @IsNotEmpty()
  content: string;
}
