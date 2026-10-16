import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { SlidersHorizontal, X } from 'lucide-react';
import { BELOW_HEADER_MAX_HEIGHT, useHeaderSlot } from './headerSlotContext';

export type NavItem = {
  label: string;
  content: React.ReactNode;
};

type NavBarProps = {
  items: NavItem[];
};

// Disclosure's close() refocuses its button, so it must only run while the panel is open.
function RegisterClose({ open, close }: { open: boolean; close: () => void }) {
  const { closePageActionsRef } = useHeaderSlot();

  useEffect(() => {
    if (!open) return;
    closePageActionsRef.current = close;
    return () => {
      if (closePageActionsRef.current === close) closePageActionsRef.current = null;
    };
  }, [open, close, closePageActionsRef]);

  return null;
}

export function NavBar({ items }: NavBarProps) {
  const { actionsSlot, panelSlot } = useHeaderSlot();

  return (
    <Disclosure as="nav" className="shrink-0 bg-white lg:border-b">
      {({ open, close }) => (
        <>
          <RegisterClose open={open} close={close} />
          <div className="mx-auto hidden px-2 lg:block">
            <div className="relative flex min-h-16 items-center justify-between py-2 lg:py-0">
              <div className="flex min-w-0 flex-1 items-center justify-start lg:items-stretch lg:justify-start">
                <div className="hidden min-w-0 lg:block lg:w-full">
                  <div className="flex min-w-0 items-end gap-5 overflow-x-auto text-sm">
                    {items.map(({ label, content }, index) => (
                      <div key={label || String(index)} className="shrink-0">
                        <label className="block mb-1 font-medium text-gray-700">{label}</label>
                        {content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {actionsSlot &&
            createPortal(
              <DisclosureButton
                id="page-actions-button"
                aria-label="Page actions"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Actions
                {open ? (
                  <X className="size-5" aria-hidden="true" />
                ) : (
                  <SlidersHorizontal className="size-5" aria-hidden="true" />
                )}
              </DisclosureButton>,
              actionsSlot,
            )}

          {panelSlot &&
            createPortal(
              <DisclosurePanel
                className={`absolute inset-x-0 top-full overflow-y-auto border-t border-gray-200 bg-white shadow-lg lg:hidden ${BELOW_HEADER_MAX_HEIGHT}`}
              >
                <div className="px-2 pt-2 pb-3 space-y-2 text-sm">
                  {items.map(({ label, content }, index) => (
                    <div
                      key={label || String(index)}
                      className="flex flex-col border-b border-gray-200 py-2"
                    >
                      <span className="block mb-1">{label}</span>
                      {content}
                    </div>
                  ))}
                </div>
              </DisclosurePanel>,
              panelSlot,
            )}
        </>
      )}
    </Disclosure>
  );
}
