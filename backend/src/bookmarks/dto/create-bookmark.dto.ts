import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { MAX_SAVED_EXAM_QUESTIONS } from '../bookmarks.service';

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

  /** Existing folder. Omit / null = not in a folder. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  collectionId?: string | null;

  /** Create this folder and save into it. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  newCollectionName?: string;
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

/** Saved-questions exam: the questions shown (in order) and the learner's picks. */
export class ScoreSavedPracticeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SAVED_EXAM_QUESTIONS)
  @IsUUID('all', { each: true })
  questionIds!: string[];

  /** Map of questionId → selected option id. Unknown ids are ignored. */
  @IsObject()
  answers!: Record<string, string>;
}
