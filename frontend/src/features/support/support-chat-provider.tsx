'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SupportWidget } from './support-widget';

type SupportChatContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SupportChatContext = createContext<SupportChatContextValue | null>(null);

export function SupportChatProvider({
  children,
  mode = 'learner',
}: {
  children: ReactNode;
  mode?: 'learner' | 'guest' | 'auto';
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <SupportChatContext.Provider value={value}>
      {children}
      <SupportWidget mode={mode} open={open} onOpenChange={setOpen} hideFab={mode === 'learner'} />
    </SupportChatContext.Provider>
  );
}

export function useSupportChat() {
  const ctx = useContext(SupportChatContext);
  if (!ctx) {
    throw new Error('useSupportChat must be used within SupportChatProvider');
  }
  return ctx;
}
