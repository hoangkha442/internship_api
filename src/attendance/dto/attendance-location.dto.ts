import { IsNumber, IsOptional } from 'class-validator';

export class AttendanceLocationDto {
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsNumber() accuracy_m?: number;
}
