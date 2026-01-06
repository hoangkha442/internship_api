import { IsOptional, IsString, MaxLength, IsNumberString } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  full_name?: string;

  // student/lecturer dùng chung
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // lecturer
  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;

  // student
  @IsOptional()
  @IsNumberString()
  class_id?: string;
}
