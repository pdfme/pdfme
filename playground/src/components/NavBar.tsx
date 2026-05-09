import { Disclosure } from '@headlessui/react';
import { Menu, X } from 'lucide-react';

export type NavItem = {
  label: string;
  content: React.ReactNode;
};

type NavBarProps = {
  items: NavItem[];
};

export function NavBar({ items }: NavBarProps) {
  return (
    <Disclosure as="nav" className="border-b bg-white">
      {({ open }) => (
        <>
          <div className="mx-auto px-2">
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

              <div className="absolute inset-y-0 right-0 flex items-center lg:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300 border">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <X className="block h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Menu className="block h-4 w-4" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="lg:hidden border-t bg-white z-10 w-full absolute">
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
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
