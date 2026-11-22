# 09 — Cloudinary Storage Architecture

## 1. Goals

- Store profile pictures, question images, news images, PDFs, and educational documents in Cloudinary
- Keep provider replaceable via `StorageService`
- Never expose API secrets or unrestricted upload credentials to the browser
- Use private/authenticated delivery or signed URLs for restricted assets

## 2. Storage Abstraction

```typescript
interface StorageService {
  upload(input: UploadInput): Promise<StoredObject>
  delete(ref: ObjectRef): Promise<void>
  generateSignedUrl(ref: ObjectRef, opts: SignedUrlOptions): Promise<string>
  getMetadata(ref: ObjectRef): Promise<ObjectMetadata>
}
```

`CloudinaryStorageService` implements this inside `CloudinaryModule`. Domain modules depend on the interface token, not the SDK.

## 3. Resource Types & Delivery

| Cloudinary concept | Use in Your Academy |
|--------------------|----------------|
| **image** | Avatars, question images, news covers — transformations/optimization |
| **raw** | PDFs and non-image documents |
| **upload** (public delivery) | Truly public marketing assets only |
| **authenticated** / **private** | Restricted PDFs, potentially question images if product requires |

**Differences:**

- **Image:** Supports transformations (resize, format `f_auto`, quality `q_auto`). Prefer these for UI performance.
- **Raw:** No image transforms; used for PDF bytes. Delivery via download URLs.
- **Authenticated/private:** Requires signed URL or authenticated request; reduces hotlinking and unauthorized distribution.

## 4. Upload Workflows

### Preferred: Signed client upload

1. Authenticated client calls `POST /storage/sign-upload` with `purpose` (`avatar` \| `question-image` \| `news-cover` \| `homepage-hero` \| `homepage-tile-logo` \| `pdf` \| `support-attachment`)
2. API checks role + purpose permissions; returns time-limited signature, folder, resource_type, constraints
3. Client uploads **directly to Cloudinary** (browser → CDN edge). PDFs **> 8 MB** use Cloudinary **chunked** upload (`Content-Range` + `X-Unique-Upload-Id`, 6 MB chunks). Smaller files use a single XHR POST with upload progress events.
4. Client calls `POST /storage/confirm` with returned `public_id`, `bytes`, `deliveryType`, optional `etag`
5. API verifies the asset with a **targeted** Admin API lookup (preferred delivery type first, short propagation retries, narrow fallbacks) and writes `MediaAsset` — avoids a multi-type fan-out that previously delayed large PDF confirms

**Why this is fast:** file bytes never transit the Nest/Nginx hop; progress is measured on the Cloudinary transfer; confirm does O(1) metadata checks instead of sequential wrong-type Admin calls.

### Alternative: Server-side upload

Multipart to API → validate → `StorageService.upload` → DB. Use for admin tools or when client upload is blocked.

**Never** embed `CLOUDINARY_API_SECRET` in frontend. Avoid unsigned presets that allow arbitrary public uploads.

## 5. Validation

| Check | Rule (initial) |
|-------|----------------|
| MIME allowlist | Images: jpeg/png/webp; tile logos also svg+xml; Documents: application/pdf |
| Size | Avatar ≤ 2 MB; homepage tile logo ≤ 2 MB; images ≤ 8 MB; PDF ≤ 40 MB (configurable) |
| Tile logo transform | Purpose `homepage-tile-logo` signs Cloudinary eager `c_fit,w_64,h_64,q_auto:good,f_auto` (backend-driven resize for ~28px CSS tiles; aspect preserved) |
| Ownership | confirm/delete only by uploader or ADMIN |
| Filename | Sanitize; do not trust client path |
| Purpose | Folder prefix per purpose: `your-academy/avatars/…` |

## 6. Database Metadata

Persist on `MediaAsset`: publicId, resourceType, deliveryType, format, bytes, mimeType, width/height, originalFilename, uploadedById.

Do **not** store base64 file contents in PostgreSQL.

## 7. Delivery

- Public images: HTTPS delivery URL (optionally via Cloudinary CDN) with transforms
- Restricted: `generateSignedUrl` with short TTL (e.g. 60–300s) for PDFs
- Next.js `<Image>` may use Cloudinary loader for images

## 8. Deletion & Orphans

1. Soft-delete domain row
2. Enqueue `maintenance-queue` job to delete Cloudinary resource
3. Mark `MediaAsset.deletedAt`

**Compensating transactions:** If Cloudinary upload succeeds and DB commit fails → enqueue delete-by-publicId. If DB succeeds and delete fails → retry job with backoff; alert on permanent failure.

## 9. Environment

See `17-environment-variables.md`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, optional upload preset names for signed flows.

## 10. Failure Recovery

- Upload timeout → client retries with new signature
- Confirm mismatch → 422; do not create MediaAsset
- SDK outage → 503 with retry-after; do not partially publish content requiring the asset

## 11. Testing

- Unit: mock `StorageService`
- Integration: optional Cloudinary test cloud gated by env; never run against prod cloud in CI
