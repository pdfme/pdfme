import { useMemo, useRef, useState, type ReactNode } from 'react';
import { HeaderSlotContext } from './headerSlotContext';

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const closePageActionsRef = useRef<(() => void) | null>(null);
  const value = useMemo(
    () => ({ actionsSlot, setActionsSlot, closePageActionsRef }),
    [actionsSlot],
  );

  return <HeaderSlotContext.Provider value={value}>{children}</HeaderSlotContext.Provider>;
}
