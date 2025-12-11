import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
    
  @ApiProperty({example: 'oldPassword123', description: 'Mật khẩu cũ' })
  @IsString()
  old_password: string;

  @ApiProperty({example: 'newPassword123', description: 'Mật khẩu mới' })
  @IsString()
  @MinLength(6)
  new_password: string;
}
