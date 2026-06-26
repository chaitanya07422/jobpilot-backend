import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token: string;

  @ApiProperty({ example: 'newsecret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
