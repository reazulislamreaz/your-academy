import { IsOptional, IsUUID } from 'class-validator';

export class RecordAttemptDto {
  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;
}
