import { IsInt, Max, Min } from 'class-validator';

export class ExtendTrialDto {
  @IsInt()
  @Min(1)
  @Max(30)
  extendDays!: number;
}
