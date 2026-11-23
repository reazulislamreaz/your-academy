import { IsObject } from 'class-validator';

/** DEC-051 — Preli Practice answers scored on the server. */
export class ScorePracticeDto {
  /** Map of questionId → selected option id. Unknown ids are ignored. */
  @IsObject()
  answers!: Record<string, string>;
}
