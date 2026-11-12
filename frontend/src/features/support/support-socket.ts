'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { SupportMessage } from '@/lib/api/support';

function socketOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5000';
}

export type SupportSocketHandlers = {
  onMessageNew?: (message: SupportMessage) => void;
  onMessageAck?: (payload: { clientMessageId?: string; message: SupportMessage }) => void;
  onMessageRead?: (payload: { conversationId: string; readAt?: string }) => void;
  onTyping?: (payload: { conversationId: string; typing: boolean; actorKind: string }) => void;
  onUnread?: (payload: { unread?: number; bump?: boolean }) => void;
  onConversationUpdated?: (payload: { conversationId: string }) => void;
};

export function useSupportSocket(enabled: boolean, handlers: SupportSocketHandlers) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;

    const socket = io(`${socketOrigin()}/support`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('support:message:new', (m: SupportMessage) => handlersRef.current.onMessageNew?.(m));
    socket.on('support:message:ack', (p) => handlersRef.current.onMessageAck?.(p));
    socket.on('support:message:read', (p) => handlersRef.current.onMessageRead?.(p));
    socket.on('support:typing', (p) => handlersRef.current.onTyping?.(p));
    socket.on('support:unread', (p) => handlersRef.current.onUnread?.(p));
    socket.on('support:conversation:updated', (p) =>
      handlersRef.current.onConversationUpdated?.(p),
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  return {
    connected,
    socket: socketRef,
    joinConversation: (conversationId: string) => {
      socketRef.current?.emit('support:join', { conversationId });
    },
    leaveConversation: (conversationId: string) => {
      socketRef.current?.emit('support:leave', { conversationId });
    },
    sendMessage: (payload: {
      conversationId: string;
      body?: string;
      clientMessageId?: string;
      mediaAssetId?: string;
      originalFilename?: string;
    }) => {
      socketRef.current?.emit('support:message:send', payload);
    },
    markRead: (conversationId: string) => {
      socketRef.current?.emit('support:message:read', { conversationId });
    },
    setTyping: (conversationId: string, typing: boolean) => {
      socketRef.current?.emit('support:typing', { conversationId, typing });
    },
  };
}
