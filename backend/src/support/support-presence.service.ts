import { Injectable } from '@nestjs/common';

type PresenceKey = string;

@Injectable()
export class SupportPresenceService {
  private readonly online = new Map<PresenceKey, Set<string>>();

  private keyFor(actor: { kind: 'user' | 'guest' | 'admin'; id: string }): PresenceKey {
    return `${actor.kind}:${actor.id}`;
  }

  markOnline(actor: { kind: 'user' | 'guest' | 'admin'; id: string }, socketId: string) {
    const key = this.keyFor(actor);
    const set = this.online.get(key) ?? new Set<string>();
    set.add(socketId);
    this.online.set(key, set);
  }

  markOffline(actor: { kind: 'user' | 'guest' | 'admin'; id: string }, socketId: string) {
    const key = this.keyFor(actor);
    const set = this.online.get(key);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) this.online.delete(key);
  }

  isOnline(actor: { kind: 'user' | 'guest' | 'admin'; id: string }): boolean {
    return (this.online.get(this.keyFor(actor))?.size ?? 0) > 0;
  }

  snapshot(): Array<{ key: string; sockets: number }> {
    return [...this.online.entries()].map(([key, set]) => ({ key, sockets: set.size }));
  }
}
