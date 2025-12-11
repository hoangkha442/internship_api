import { IsEnum } from 'class-validator'
import { internships_status } from '@prisma/client'

export class UpdateInternshipStatusDto {
  @IsEnum(internships_status)
  status: internships_status
}
