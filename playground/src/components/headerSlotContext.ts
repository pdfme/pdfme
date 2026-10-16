import { createContext, useContext } from 'react';

export type HeaderSlotContextValue = {
  actionsSlot: HTMLElement | null;
  setActionsSlot: (element: HTMLElement | null) => void;
  closePageActionsRef: { current: (() => void) | null };
};

export const HeaderSlotContext = createContext<HeaderSlotContextValue>({
  actionsSlot: null,
  setActionsSlot: () => {},
  closePageActionsRef: { current: null },
});

export const useHeaderSlot = () => useContext(HeaderSlotContext);
