import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkLogAttachmentDto {
  @ApiProperty({ example: '/uploads/worklog/abc.pdf' })
  @IsString()
  file_path: string;

  @ApiPropertyOptional({ example: 'Báo cáo phân tích' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateWorkLogDto {
  @ApiProperty({ example: 12 })
  @IsString()
  internship_id: string;

  @ApiProperty({ example: '2025-12-23' })
  @IsDateString()
  work_date: string;

  @ApiProperty({ example: 'Hôm nay em làm module đăng ký đề tài...' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ type: [CreateWorkLogAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkLogAttachmentDto)
  attachments?: CreateWorkLogAttachmentDto[];

  @IsOptional()
  descriptions?: string[];
}
