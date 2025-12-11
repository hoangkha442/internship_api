import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { users_role } from '@prisma/client';

export class CreateAuthDto {
  @ApiProperty({ example: 'Alan' })
  @IsString({message: "Họ và tên phải là chuỗi ký tự"})
  full_name: string;

  @ApiProperty()
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @ApiProperty()
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  password: string;

  @ApiProperty({ enum: users_role })
  @IsEnum(users_role)
  role: users_role;

  // Fields riêng cho student
  @ApiProperty({ required: false })
  @IsOptional()
  student_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  class_id?: bigint;

  // Fields riêng cho lecturer
  @ApiProperty({ required: false })
  @IsOptional()
  lecturer_code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  phone?: string;
}
