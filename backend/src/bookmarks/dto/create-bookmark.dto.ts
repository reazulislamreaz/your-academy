import { IsUUID } from 'class-validator';

export class CreateQuestionBookmarkDto {
  @IsUUID()
  questionId!: string;
}

export class CreateDocumentBookmarkDto {
  @IsUUID()
  documentId!: string;
}
