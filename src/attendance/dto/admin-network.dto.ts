import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAllowedNetworkDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsNotEmpty() @IsString() cidr!: string; 
}

export class UpdateAllowedNetworkDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() cidr?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
