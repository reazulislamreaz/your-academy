import { ValidationPipe } from '@nestjs/common';
import { SetAvatarDto } from '../../users/dto/set-avatar.dto';
import { SupportUploadConfirmDto, SupportUploadSignDto } from '../dto/support-upload.dto';

/** SEC-8 — the bodies the web client sends pass; malformed ones are a 400, not a 500. */
describe('support upload / avatar DTOs', () => {
  // Same options as main.ts.
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const run = (metatype: new () => object, value: unknown) =>
    pipe.transform(value, { type: 'body', metatype });

  it('accepts exactly what the web client sends', async () => {
    await expect(
      run(SupportUploadSignDto, { mimeType: '', resourceType: 'raw' }),
    ).resolves.toBeDefined();
    await expect(
      run(SupportUploadConfirmDto, {
        publicId: 'support/g/abc.pdf',
        resourceType: 'raw',
        bytes: 1234,
        format: 'pdf',
        mimeType: 'application/pdf',
        originalFilename: 'notes.pdf',
      }),
    ).resolves.toBeDefined();
    await expect(
      run(SetAvatarDto, { mediaAssetId: '11111111-1111-4111-8111-111111111111' }),
    ).resolves.toBeDefined();
  });

  it('rejects a missing publicId, a non-UUID avatar id and unknown fields', async () => {
    await expect(run(SupportUploadConfirmDto, { bytes: 5 })).rejects.toThrow();
    await expect(run(SetAvatarDto, { mediaAssetId: 'x' })).rejects.toThrow();
    await expect(run(SupportUploadSignDto, { resourceType: 'video' })).rejects.toThrow();
  });
});
