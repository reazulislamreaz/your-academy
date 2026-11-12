import { IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateQuestionBookmarkDto {
  @IsUUID()
  questionId!: string;

  /** Existing folder. Omit / null = Saved Items (uncategorized). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  collectionId?: string | null;

  /** Create this folder and save into it (ignored when collectionId is set). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  newCollectionName?: string;
}

export class CreateDocumentBookmarkDto {
  @IsUUID()
  documentId!: string;
}

export class CreateBookmarkCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class UpdateBookmarkCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class MoveQuestionBookmarkDto {
  /** Target folder, or null to uncategorize. */
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  collectionId!: string | null;
}
