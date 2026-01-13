import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReviewProgressReportDto {
  @IsOptional()
  @IsIn(['reviewed', 'needs_revision'])
  status?: 'reviewed' | 'needs_revision';

  @IsOptional()
  @IsNumber()
  score?: number | null;

  // HTML hoặc text đều được
  @IsOptional()
  @IsString()
  feedback?: string | null;

  @IsOptional()
  @IsBoolean()
  is_pass?: boolean | null;
}
