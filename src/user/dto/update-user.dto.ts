import { IsOptional, IsString, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { users_role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({example: 'Nguyen Van A', description: 'Họ và tên đầy đủ', required: false })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({example: 'example@example.com', description: 'Địa chỉ email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({example: 'student', description: 'Vai trò của user', required: false, enum: users_role })
  @IsOptional()
  @IsEnum(users_role)
  role?: users_role;

  @ApiProperty({example: true, description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
