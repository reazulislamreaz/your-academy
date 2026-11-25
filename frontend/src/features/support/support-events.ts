/**
 * Open the floating support chat from anywhere on the page (e.g. "Contact us to upgrade").
 * The mounted SupportWidget listens for this event; nothing happens if no widget is mounted.
 */
export const OPEN_SUPPORT_CHAT_EVENT = 'ya:open-support-chat';

export function openSupportChat(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_SUPPORT_CHAT_EVENT));
}
