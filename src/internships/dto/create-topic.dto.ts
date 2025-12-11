import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateTopicDto {

  @ApiProperty({ example: 'Phát triển ứng dụng web xử dụng ReactJS và NestJS', description: 'Tiêu đề đề tài' })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ example: 'Đề tài này nhằm mục đích phát triển một ứng dụng web...', description: 'Mô tả đề tài', required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: 'Công ty TNHH Phần mềm ABC', description: 'Tên công ty thực tập', required: false })
  @IsOptional()
  @IsString()
  company_name?: string

  @ApiProperty({ example: '123 Đường Lập Trình, Quận 1, TP.HCM', description: 'Địa chỉ công ty thực tập', required: false })
  @IsOptional()
  @IsString()
  company_address?: string
}
