import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { PDFME_VERSION } from '@pdfme/common';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverBackdrop,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { Menu, X } from 'lucide-react';
import { useHeaderSlot } from './headerSlotContext';

const externalIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="size-4 ml-1"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-40">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />
      <div className="fixed inset-0 z-40 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            <div>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-gray-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <DialogTitle as="h3" className="text-base font-semibold text-gray-900 mb-5">
                  Need Help?
                </DialogTitle>
                <div className="mt-2 space-y-4">
                  <button
                    onClick={() =>
                      window.open(
                        'https://app.pdfme.com/contact?utm_source=playground&utm_content=need-help',
                        '_blank',
                      )
                    }
                    className="flex justify-center items-center w-full rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Need technical help or consulting?
                    {externalIcon}
                  </button>
                  <button
                    onClick={() => window.open('https://discord.gg/xWPTJbmgNV', '_blank')}
                    className="flex justify-center items-center w-full rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
                  >
                    Need help by community?
                    {externalIcon}
                  </button>
                  <button
                    onClick={() => window.open('https://github.com/pdfme/pdfme/issues', '_blank')}
                    className="flex justify-center items-center w-full rounded-md bg-gray-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
                  >
                    Found bugs? Report them on our GitHub issues page.
                    {externalIcon}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

const githubIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5 mr-1"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const helpIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5 mr-1"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
    />
  </svg>
);

const CODE_URL = 'https://github.com/pdfme/pdfme/tree/main/playground';
const REPO_URL = 'https://github.com/pdfme/pdfme';

const navLinks = [
  { id: 'templates-nav', to: '/templates', label: 'Templates' },
  { id: 'workspace-nav', to: '/workspace', label: 'My Workspace' },
  { id: 'designer-nav', to: '/designer', label: 'Designer' },
  { id: 'form-viewer-nav', to: '/form-viewer', label: 'Form/Viewer' },
  { id: 'jsx-nav', to: '/jsx', label: 'JSX' },
  { id: 'md2pdf-nav', to: '/md2pdf', label: 'md2pdf' },
];

const isTemplatesAlias = (to: string, pathname: string) => to === '/templates' && pathname === '/';

function StarBadge({ failed, onError }: { failed: boolean; onError: () => void }) {
  return failed ? (
    '★ Star on GitHub'
  ) : (
    <img
      src="https://img.shields.io/github/stars/pdfme/pdfme?style=social"
      alt="Star pdfme on GitHub"
      height={20}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={onError}
      className="h-5 w-auto"
    />
  );
}

export default function Navigation() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [starBadgeFailed, setStarBadgeFailed] = useState(false);
  const location = useLocation();
  const { setActionsSlot, closePageActionsRef } = useHeaderSlot();
  const onStarBadgeError = () => setStarBadgeFailed(true);

  const currentPage = navLinks.find(
    ({ to }) => location.pathname === to || isTemplatesAlias(to, location.pathname),
  );

  const linkClass = ({ isActive }: { isActive: boolean }, to: string) =>
    classNames(
      isActive || isTemplatesAlias(to, location.pathname)
        ? 'border-green-500 text-green-600'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
      'whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium',
    );

  const mobileLinkClass = (isCurrent: boolean) =>
    classNames(
      isCurrent
        ? 'bg-green-50 text-green-700'
        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
      'flex min-h-11 items-center rounded-md px-3 text-base font-medium',
    );

  const homeLink = (
    <NavLink
      to="/"
      className="flex items-center gap-2 py-2 pr-2 text-sm font-semibold text-gray-900 hover:text-green-700"
    >
      <span className="size-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.16)]" />
      pdfme playground
    </NavLink>
  );

  const versionBadge = (
    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 select-none">
      Version: {PDFME_VERSION}
    </span>
  );

  return (
    <header className="relative z-30 shrink-0 border-b border-gray-200 bg-white shadow-sm lg:bg-white/95 lg:backdrop-blur">
      <div className="hidden overflow-x-auto overflow-y-hidden lg:block">
        <nav aria-label="Tabs" className="-mb-px flex w-max min-w-full items-center gap-3 px-4">
          {homeLink}
          {versionBadge}

          {navLinks.map((item) => (
            <NavLink
              id={item.id}
              key={item.to}
              to={item.to}
              end
              className={(state) => linkClass(state, item.to)}
            >
              {item.label}
            </NavLink>
          ))}

          <a
            href={CODE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b-2 border-transparent px-1 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 flex items-center"
          >
            {githubIcon}
            Code
          </a>

          <button
            type="button"
            onClick={() => setHelpModalOpen(true)}
            className="border-b-2 border-transparent px-1 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 flex items-center"
          >
            {helpIcon}
            Help
          </button>

          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={classNames(
              'ml-auto flex shrink-0 items-center py-2',
              starBadgeFailed
                ? 'whitespace-nowrap text-sm font-medium text-gray-500 hover:text-gray-700'
                : 'hover:opacity-80',
            )}
          >
            <StarBadge failed={starBadgeFailed} onError={onStarBadgeError} />
          </a>
        </nav>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-1.5 lg:hidden">
        {homeLink}
        <div className="flex items-center gap-2">
          <div ref={setActionsSlot} className="flex items-center" />
          <Popover key={location.pathname}>
            {({ open, close }) => (
              <>
                <PopoverButton
                  id="site-menu-button"
                  onClick={() => closePageActionsRef.current?.()}
                  aria-label={`${open ? 'Close' : 'Open'} navigation menu (current page: ${
                    currentPage?.label ?? 'none'
                  })`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  {currentPage && <span className="max-w-32 truncate">{currentPage.label}</span>}
                  {open ? (
                    <X className="size-5" aria-hidden="true" />
                  ) : (
                    <Menu className="size-5" aria-hidden="true" />
                  )}
                </PopoverButton>
                <PopoverBackdrop className="absolute inset-x-0 top-full h-dvh bg-black/20" />
                <PopoverPanel
                  focus
                  className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-gray-200 bg-white shadow-lg"
                >
                  <nav aria-label="Primary" className="px-2 py-2">
                    <ul role="list" className="space-y-1">
                      {navLinks.map((item) => {
                        const isCurrent = item === currentPage;
                        return (
                          <li key={item.to}>
                            <Link
                              to={item.to}
                              onClick={() => close()}
                              aria-current={isCurrent ? 'page' : undefined}
                              className={mobileLinkClass(isCurrent)}
                            >
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 px-5 py-3 text-sm font-medium text-gray-600">
                    <a
                      href={CODE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center hover:text-gray-900"
                    >
                      {githubIcon}
                      Code
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        setHelpModalOpen(true);
                      }}
                      className="flex min-h-11 items-center hover:text-gray-900"
                    >
                      {helpIcon}
                      Help
                    </button>
                    <a
                      href={REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center whitespace-nowrap hover:opacity-80"
                    >
                      <StarBadge failed={starBadgeFailed} onError={onStarBadgeError} />
                    </a>
                    <span className="ml-auto">{versionBadge}</span>
                  </div>
                </PopoverPanel>
              </>
            )}
          </Popover>
        </div>
      </div>

      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </header>
  );
}
