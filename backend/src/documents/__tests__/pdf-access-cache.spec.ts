import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentVisibility } from '@prisma/client';
import { DocumentsService } from '../documents.service';
import { publicPdfByteCache } from '../pdf-byte-cache';

/** SEC-1 — the per-document byte cache must never let a viewer skip the access check. */
describe('DocumentsService PDF bytes vs cache (SEC-1)', () => {
  const asset = {
    id: 'asset-1',
    publicId: 'docs/premium',
    mimeType: 'application/pdf',
    originalFilename: 'premium.pdf',
    resourceType: 'RAW',
    deliveryType: 'authenticated',
    deletedAt: null,
  };
  const prisma = { document: { findFirst: jest.fn() } };
  const access = { resolve: jest.fn(), canAccess: jest.fn() };
  const service = new DocumentsService(
    prisma as never,
    {} as never,
    access as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const bytes = {
    buffer: Buffer.from('%PDF-premium'),
    contentType: 'application/pdf',
    filename: 'premium.pdf',
  };
  const paid = { userId: 'paid-1', role: 'USER' as const, sessionId: 's1' };
  const free = { userId: 'free-1', role: 'USER' as const, sessionId: 's2' };

  beforeEach(() => {
    jest.resetAllMocks();
    publicPdfByteCache.delete('auth:doc-1');
    publicPdfByteCache.delete('public:doc-1');
    prisma.document.findFirst.mockResolvedValue({
      visibility: DocumentVisibility.PREMIUM,
      mediaAsset: asset,
    });
    access.resolve.mockImplementation(async (u: { userId: string }) => ({ userId: u.userId }));
    access.canAccess.mockImplementation(
      async (snap: { userId: string }) => snap.userId === 'paid-1',
    );
    jest
      .spyOn(
        service as unknown as { fetchPdfPayload: () => Promise<typeof bytes> },
        'fetchPdfPayload',
      )
      .mockResolvedValue(bytes);
  });

  it('paid user gets the PDF, then a free user is still refused (no cache bypass)', async () => {
    await expect(service.getAuthenticatedPdfBytes('doc-1', paid)).resolves.toMatchObject({
      filename: 'premium.pdf',
    });
    // The bytes are now cached under auth:doc-1.
    await expect(service.getAuthenticatedPdfBytes('doc-1', free)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(access.canAccess).toHaveBeenCalledTimes(2);
  });

  it('a cached premium PDF is refused once the document is unpublished', async () => {
    await service.getAuthenticatedPdfBytes('doc-1', paid);
    prisma.document.findFirst.mockResolvedValue(null);
    await expect(service.getAuthenticatedPdfBytes('doc-1', paid)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('public bytes stop being served as soon as the document is no longer PUBLIC', async () => {
    prisma.document.findFirst.mockResolvedValueOnce({ mediaAsset: asset });
    await service.getPublicPdfBytes('doc-1');
    prisma.document.findFirst.mockResolvedValueOnce(null);
    await expect(service.getPublicPdfBytes('doc-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
