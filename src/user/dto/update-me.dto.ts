import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @ApiProperty({example: 'Nguyen Van A', description: 'Họ và tên người dùng' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({example: '0123456789', description: 'Số điện thoại người dùng' })
  @IsOptional()
  @IsString()
  phone?: string;
}
