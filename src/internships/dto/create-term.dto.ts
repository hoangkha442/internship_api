import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsNotEmpty, IsString } from 'class-validator'

export class CreateTermDto {
  @ApiProperty({example:"Kỳ hè 2025"})
  @IsString()
  @IsNotEmpty()
  term_name: string

  @ApiProperty({example:"2025-06-01"})
  @IsDateString()
  start_date: string

  @ApiProperty({example:"2025-08-31"})
  @IsDateString()
  end_date: string
}
