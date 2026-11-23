import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

/** DEC-052 — Admin grants a subscription window to a learner. */
export class GrantSubscriptionDto {
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsISO8601()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RevokeSubscriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
