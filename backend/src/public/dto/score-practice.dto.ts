import { IsObject } from 'class-validator';

/** Preli Practice answers scored on the server (locked sets refused — DEC-060). */
export class ScorePracticeDto {
  /** Map of questionId → selected option id. Unknown ids are ignored. */
  @IsObject()
  answers!: Record<string, string>;
}
