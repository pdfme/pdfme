import { createContext, useContext } from 'react';

// For elements positioned at top-full inside the header, 100% resolves to the header height.
export const BELOW_HEADER_HEIGHT =
  'h-[calc(100vh-100%)] supports-[height:100dvh]:h-[calc(100dvh-100%)]';
export const BELOW_HEADER_MAX_HEIGHT =
  'max-h-[calc(100vh-100%)] supports-[height:100dvh]:max-h-[calc(100dvh-100%)]';

export type HeaderSlotContextValue = {
  actionsSlot: HTMLElement | null;
  setActionsSlot: (element: HTMLElement | null) => void;
  panelSlot: HTMLElement | null;
  setPanelSlot: (element: HTMLElement | null) => void;
  closePageActionsRef: { current: (() => void) | null };
};

export const HeaderSlotContext = createContext<HeaderSlotContextValue>({
  actionsSlot: null,
  setActionsSlot: () => {},
  panelSlot: null,
  setPanelSlot: () => {},
  closePageActionsRef: { current: null },
});

export const useHeaderSlot = () => useContext(HeaderSlotContext);
