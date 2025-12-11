import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'
import { users_role } from '@prisma/client'

export class CreateUserDto {
  @IsString()
  full_name: string

  @IsEmail()
  email: string

  @IsString()
  password: string

  @IsEnum(users_role)
  role: users_role

  // student fields
  @IsOptional()
  @IsString()
  student_code?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  class_id?: string

  // lecturer fields
  @IsOptional()
  @IsString()
  lecturer_code?: string

  @IsOptional()
  @IsString()
  department?: string
}
