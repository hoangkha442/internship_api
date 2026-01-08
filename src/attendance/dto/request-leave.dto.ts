import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { attendance_records_status } from '@prisma/client';

export class RequestLeaveDto {
  @IsNotEmpty()
  date!: string; 

  @IsEnum(attendance_records_status)
  status!: attendance_records_status;

  @IsOptional()
  @IsString()
  reason?: string;
}
