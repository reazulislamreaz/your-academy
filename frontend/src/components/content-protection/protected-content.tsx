'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useMe } from '@/features/auth/use-auth';
import {
  buildWatermarkMask,
  isEditableTarget,
  maskWhatsapp,
  useBlockedShortcuts,
  useWindowInactive,
} from './use-content-protection';

const SITE_WATERMARK = 'youracademy.com.bd';

type ProtectionContext = { setBlurOverride: (value: boolean | null) => void };

/** Lets nested route layouts (e.g. a result segment) change the outer wrapper's blur without double watermarks. */
const ProtectedContentContext = createContext<ProtectionContext | null>(null);

export type ProtectedContentProps = {
  children: ReactNode;
  /** Blur content while the tab is hidden / window unfocused. Intended for exam players. */
  blurOnHidden?: boolean;
};

/**
 * Lightweight copy/download deterrents for learner question content.
 * NOT a security boundary: answers are gated by the API (AGENTS.md §6). Never used in `/admin`.
 */
export function ProtectedContent({ children, blurOnHidden = false }: ProtectedContentProps) {
  const pathname = usePathname();
  const parent = useContext(ProtectedContentContext);

  if (pathname?.startsWith('/admin')) return <>{children}</>;
  if (parent) return <NestedProtection parent={parent} blurOnHidden={blurOnHidden}>{children}</NestedProtection>;
  return <RootProtection blurOnHidden={blurOnHidden}>{children}</RootProtection>;
}

function NestedProtection({
  parent,
  blurOnHidden,
  children,
}: {
  parent: ProtectionContext;
  blurOnHidden: boolean;
  children: ReactNode;
}) {
  const { setBlurOverride } = parent;
  useEffect(() => {
    setBlurOverride(blurOnHidden);
    return () => setBlurOverride(null);
  }, [blurOnHidden, setBlurOverride]);
  return <>{children}</>;
}

function preventUnlessEditable(event: ClipboardEvent | MouseEvent): void {
  if (!isEditableTarget(event.target)) event.preventDefault();
}

function preventImageDrag(event: DragEvent): void {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
}

function RootProtection({ children, blurOnHidden }: { children: ReactNode; blurOnHidden: boolean }) {
  const [blurOverride, setBlurOverride] = useState<boolean | null>(null);
  const blurEnabled = blurOverride ?? blurOnHidden;
  const inactive = useWindowInactive(blurEnabled);
  useBlockedShortcuts(true);

  const me = useMe();
  const user = me.data;
  const maskImage = useMemo(() => {
    if (!user) return buildWatermarkMask([SITE_WATERMARK]);
    const date = new Date().toISOString().slice(0, 10);
    return buildWatermarkMask([
      `${maskWhatsapp(user.whatsappNumber)} · ${user.id.slice(0, 8)}`,
      `${SITE_WATERMARK} · ${date}`,
    ]);
  }, [user]);

  const ctx = useMemo<ProtectionContext>(() => ({ setBlurOverride }), []);

  return (
    <ProtectedContentContext.Provider value={ctx}>
      <div
        data-protected-content=""
        className="ya-protected-content relative min-w-0"
        onCopy={preventUnlessEditable}
        onCut={preventUnlessEditable}
        onContextMenu={preventUnlessEditable}
        onDragStart={preventImageDrag}
      >
        {children}
        <div
          aria-hidden
          className="ya-protected-watermark"
          style={{ maskImage, WebkitMaskImage: maskImage }}
        />
        {blurEnabled && inactive ? (
          <div aria-hidden className="ya-protected-blur">
            <span>Content hidden while this window is inactive</span>
          </div>
        ) : null}
      </div>
    </ProtectedContentContext.Provider>
  );
}
