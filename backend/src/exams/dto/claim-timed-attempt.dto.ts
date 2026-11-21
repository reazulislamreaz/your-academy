import { IsIn, IsString, IsUUID } from 'class-validator';

export class ClaimTimedAttemptDto {
  @IsIn(['exam', 'model-test'])
  kind!: 'exam' | 'model-test';

  @IsUUID()
  @IsString()
  attemptId!: string;
}
