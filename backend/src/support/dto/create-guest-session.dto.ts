import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGuestSessionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  whatsappNumber!: string;
}
