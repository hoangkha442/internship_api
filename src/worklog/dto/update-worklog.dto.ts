import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWorkLogAttachmentDto } from './create-worklog.dto';

export class UpdateWorkLogDto {
  @ApiPropertyOptional({ example: '2025-12-24' })
  @IsOptional()
  @IsDateString()
  work_date?: string;

  @ApiPropertyOptional({ example: 'Update nội dung...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [CreateWorkLogAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkLogAttachmentDto)
  attachments?: CreateWorkLogAttachmentDto[];

    @IsOptional()
  descriptions?: string[]
}
