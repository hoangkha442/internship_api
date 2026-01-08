import { IsOptional, IsString } from 'class-validator';

export class ReviewLeaveDto {
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() rejection_reason?: string;
}
