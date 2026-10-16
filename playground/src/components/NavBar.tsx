import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Menu, SlidersHorizontal, X } from 'lucide-react';
import { useHeaderSlot } from './headerSlotContext';

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
  const { actionsSlot } = useHeaderSlot();

  return (
    <Disclosure
      as="nav"
      className={`relative shrink-0 bg-white ${actionsSlot ? 'lg:border-b' : 'border-b'}`}
    >
      {({ open, close }) => (
        <>
          <RegisterClose open={open} close={close} />
          <div className={actionsSlot ? 'mx-auto hidden px-2 lg:block' : 'mx-auto px-2'}>
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

              {!actionsSlot && (
                <div className="absolute inset-y-0 right-0 flex items-center lg:hidden">
                  <DisclosureButton className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300 border">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <X className="block h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Menu className="block h-4 w-4" aria-hidden="true" />
                    )}
                  </DisclosureButton>
                </div>
              )}
            </div>
          </div>

          {actionsSlot &&
            createPortal(
              <DisclosureButton
                id="page-actions-button"
                aria-label={`${open ? 'Close' : 'Open'} page actions`}
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

          <DisclosurePanel className="lg:hidden border-t bg-white z-10 w-full absolute max-h-[calc(100dvh-4rem)] overflow-y-auto">
            <div className="px-2 pt-2 pb-3 space-y-2 text-sm shadow-md rounded-md bg-white">
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
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}
