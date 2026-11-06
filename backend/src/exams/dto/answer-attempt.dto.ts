import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class AttachQuestionsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  questionIds!: string[];
}

export class AnswerAttemptDto {
  @IsString()
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;
}
