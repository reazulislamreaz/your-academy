import { apiFetch, apiFetchResult } from './client';

export type SupportConversation = {
  id: string;
  status: string;
  subject: string | null;
  userId: string | null;
  guestSessionId: string | null;
  guestName: string | null;
  guestWhatsapp: string | null;
  assignedAdminId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  userUnreadCount: number;
  adminUnreadCount: number;
  closedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participantName: string | null;
  participantAvatarUrl: string | null;
};

export type SupportMessage = {
  id: string;
  conversationId: string;
  senderType: string;
  senderUserId: string | null;
  clientMessageId: string | null;
  kind: string;
  body: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  attachments: Array<{
    id: string;
    mediaAssetId: string;
    originalFilename: string;
    mimeType: string;
    bytes: number;
    downloadUrl: string | null;
  }>;
};

export type SupportGuest = {
  id: string;
  name: string;
  whatsappNumber: string;
};

export type SupportInternalNote = {
  id: string;
  conversationId: string;
  authorAdminId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type SupportUnread = { unread: number };

export async function createGuestSession(input: { name: string; whatsappNumber: string }) {
  return apiFetch<SupportGuest & { expiresAt: string }>('/support/guest/session', {
    method: 'POST',
    body: JSON.stringify(input),
    skipRefresh: true,
  });
}

export async function getGuestMe() {
  return apiFetch<SupportGuest | null>('/support/guest/me', { skipRefresh: true });
}

export async function getSupportUnread() {
  return apiFetch<SupportUnread>('/support/unread');
}

export async function getOrCreateMyConversation() {
  return apiFetch<SupportConversation>('/support/conversations/mine');
}

export async function listSupportMessages(conversationId: string, cursor?: string, limit = 40) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set('cursor', cursor);
  return apiFetchResult<SupportMessage[]>(
    `/support/conversations/${conversationId}/messages?${qs}`,
  );
}

export async function sendSupportMessage(
  conversationId: string,
  body: {
    body?: string;
    clientMessageId?: string;
    mediaAssetId?: string;
    originalFilename?: string;
  },
) {
  return apiFetch<SupportMessage>(`/support/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function markSupportRead(conversationId: string) {
  return apiFetch<{ ok: boolean; readAt: string }>(`/support/conversations/${conversationId}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function signSupportUpload(opts?: { mimeType?: string; resourceType?: 'image' | 'raw' }) {
  return apiFetch<{
    configured: boolean;
    cloudName: string;
    apiKey: string;
    folder: string;
    timestamp: number;
    signature: string;
    purpose: string;
    resourceType: 'image' | 'raw';
    deliveryType: string;
  }>('/support/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({
      mimeType: opts?.mimeType,
      resourceType: opts?.resourceType,
    }),
  });
}

export async function confirmSupportUpload(input: {
  publicId: string;
  resourceType?: 'image' | 'raw';
  bytes?: number;
  mimeType?: string;
  format?: string;
  originalFilename?: string;
}) {
  return apiFetch<{ id: string; publicId: string; bytes: number; mimeType: string }>(
    '/support/uploads/confirm',
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export async function uploadSupportAttachment(file: File) {
  const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';
  const sign = await signSupportUpload({ mimeType: file.type, resourceType });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);
  if (sign.deliveryType && sign.deliveryType !== 'upload') {
    form.append('type', sign.deliveryType);
  }
  const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`;
  const uploaded = await fetch(endpoint, { method: 'POST', body: form });
  if (!uploaded.ok) {
    const text = await uploaded.text();
    throw new Error(`Upload failed: ${text.slice(0, 200)}`);
  }
  const payload = (await uploaded.json()) as {
    public_id: string;
    bytes?: number;
    format?: string;
    resource_type?: string;
  };
  return confirmSupportUpload({
    publicId: payload.public_id,
    resourceType: sign.resourceType,
    bytes: payload.bytes,
    format: payload.format,
    mimeType: file.type || undefined,
    originalFilename: file.name,
  });
}

/** Admin */

export async function listAdminSupportConversations(params: {
  q?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams({ limit: String(params.limit ?? 30) });
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.cursor) qs.set('cursor', params.cursor);
  return apiFetchResult<SupportConversation[]>(`/admin/support/conversations?${qs}`);
}

export async function getAdminSupportConversation(id: string) {
  return apiFetch<SupportConversation>(`/admin/support/conversations/${id}`);
}

export async function updateAdminSupportConversation(
  id: string,
  body: { status?: string; assignedAdminId?: string | null },
) {
  return apiFetch<SupportConversation>(`/admin/support/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function listAdminSupportMessages(conversationId: string, cursor?: string) {
  const qs = new URLSearchParams({ limit: '50' });
  if (cursor) qs.set('cursor', cursor);
  return apiFetchResult<SupportMessage[]>(
    `/admin/support/conversations/${conversationId}/messages?${qs}`,
  );
}

export async function sendAdminSupportMessage(
  conversationId: string,
  body: { body?: string; clientMessageId?: string; mediaAssetId?: string; originalFilename?: string },
) {
  return apiFetch<SupportMessage>(`/admin/support/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function markAdminSupportRead(conversationId: string) {
  return apiFetch<{ ok: boolean; readAt: string }>(
    `/admin/support/conversations/${conversationId}/read`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function listSupportNotes(conversationId: string) {
  return apiFetch<SupportInternalNote[]>(`/admin/support/conversations/${conversationId}/notes`);
}

export async function createSupportNote(conversationId: string, body: string) {
  return apiFetch<SupportInternalNote>(`/admin/support/conversations/${conversationId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}
