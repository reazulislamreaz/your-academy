import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

/** DEC-067 — which logs, and which time window, to purge. */
export class PurgePreviewDto {
  @IsIn(['audit', 'activity', 'all'])
  target!: 'audit' | 'activity' | 'all';

  @IsIn(['retention', 'before', 'range'])
  mode!: 'retention' | 'before' | 'range';

  @IsOptional()
  @IsISO8601()
  before?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class PurgeLogsDto extends PurgePreviewDto {
  /** Must be exactly "DELETE". */
  @IsString()
  @MaxLength(10)
  confirm!: string;
}
