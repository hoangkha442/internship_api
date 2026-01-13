// import { IsOptional, IsString, IsNumber } from 'class-validator';

// export class UpdateProgressReportDto {
//   @IsOptional()
//   @IsNumber()
//   report_no?: number;

//   @IsOptional()
//   @IsNumber()
//   week_no?: number;

//   @IsOptional()
//   @IsString()
//   title?: string;

//   @IsOptional()
//   @IsString()
//   content?: string;

//   // frontend có thể gửi "_replace_attachments=1"
//   @IsOptional()
//   @IsString()
//   _replace_attachments?: string;
// }

import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProgressReportDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNumberString()
  report_no?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNumberString()
  week_no?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  _replace_attachments?: string;
}
