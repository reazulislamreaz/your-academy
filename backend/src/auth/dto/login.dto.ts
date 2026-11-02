import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  whatsappNumber!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
