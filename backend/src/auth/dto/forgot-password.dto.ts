import { IsEmail, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ForgotPasswordDto {
  @ValidateIf((o: ForgotPasswordDto) => !o.whatsappNumber)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ValidateIf((o: ForgotPasswordDto) => !o.email)
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  whatsappNumber?: string;
}
