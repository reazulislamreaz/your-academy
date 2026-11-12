import { Injectable } from '@nestjs/common';

type PresenceKey = string;
type ActorRef = { kind: 'user' | 'guest' | 'admin'; id: string };

@Injectable()
export class SupportPresenceService {
  private readonly online = new Map<PresenceKey, Set<string>>();
  private readonly lastSeenAt = new Map<PresenceKey, Date>();

  private keyFor(actor: ActorRef): PresenceKey {
    return `${actor.kind}:${actor.id}`;
  }

  markOnline(actor: ActorRef, socketId: string) {
    const key = this.keyFor(actor);
    const set = this.online.get(key) ?? new Set<string>();
    set.add(socketId);
    this.online.set(key, set);
    this.lastSeenAt.delete(key);
  }

  markOffline(actor: ActorRef, socketId: string) {
    const key = this.keyFor(actor);
    const set = this.online.get(key);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
      this.online.delete(key);
      this.lastSeenAt.set(key, new Date());
    }
  }

  isOnline(actor: ActorRef): boolean {
    return (this.online.get(this.keyFor(actor))?.size ?? 0) > 0;
  }

  lastSeen(actor: ActorRef): Date | null {
    if (this.isOnline(actor)) return null;
    return this.lastSeenAt.get(this.keyFor(actor)) ?? null;
  }

  snapshot(): Array<{ key: string; sockets: number; lastSeenAt: string | null }> {
    const keys = new Set([...this.online.keys(), ...this.lastSeenAt.keys()]);
    return [...keys].map((key) => ({
      key,
      sockets: this.online.get(key)?.size ?? 0,
      lastSeenAt: this.lastSeenAt.get(key)?.toISOString() ?? null,
    }));
  }
}
