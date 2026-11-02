import { IsIn, IsString } from 'class-validator';
import { UPLOAD_PURPOSES } from '../storage.types';

export class SignUploadDto {
  @IsString()
  @IsIn([...UPLOAD_PURPOSES])
  purpose!: (typeof UPLOAD_PURPOSES)[number];
}
