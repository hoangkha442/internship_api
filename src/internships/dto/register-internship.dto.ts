import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator'

export class RegisterInternshipDto {
  @ApiProperty({ example: '1', description: 'ID kỳ thực tập' })
  @IsNumberString()
  @IsNotEmpty()
  term_id: string

  @ApiProperty({ example: '2', description: 'ID đề tài thực tập' })
  @IsNumberString()
  @IsNotEmpty()
  topic_id: string

  @ApiProperty({ example: '3', description: 'ID giảng viên hướng dẫn' })
  @IsNumberString()
  @IsNotEmpty()
  lecturer_id: string

  @ApiProperty({ example: '2025-06-01', description: 'Ngày bắt đầu thực tập (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  start_date: string

  @ApiProperty({ example: '2025-08-31', description: 'Ngày kết thúc thực tập (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  end_date: string
}
