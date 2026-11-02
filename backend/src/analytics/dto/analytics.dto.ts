import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class StartSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientInstanceId?: string;
}

export class HeartbeatDto {
  @IsOptional()
  @IsIn(['visible', 'hidden'])
  visibilityState?: 'visible' | 'hidden';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientInstanceId?: string;
}
