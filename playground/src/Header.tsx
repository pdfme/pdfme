import { NavLink } from "react-router-dom";
import { PDFME_VERSION } from "@pdfme/common"

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function Navigation() {
  return (
    <div className="border-b border-gray-200 my-1">
      <nav aria-label="Tabs" className="-mb-px flex items-center space-x-3 px-4">
        <span className="text-xs text-gray-500 select-none">
          <span>Version:</span> {PDFME_VERSION}
        </span>

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            classNames(
              isActive
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
              "whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium"
            )
          }
        >
          Designer
        </NavLink>

        <NavLink
          to="/form-viewer"
          className={({ isActive }) =>
            classNames(
              isActive
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
              "whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium"
            )
          }
        >
          Form, Viewer
        </NavLink>

        <a
          href="https://github.com/pdfme/pdfme/tree/main/playground"
          target="_blank"
          rel="noopener noreferrer"
          className="border-b-2 border-transparent px-1 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 flex items-center"
        >
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
          Code
        </a>

        <a
          className="border-b-2 border-transparent px-1 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 flex items-center"
          onClick={() => {
            if (window.confirm("Need technical help or consulting?")) {
              window.open("https://app.pdfme.com/contact?utm_source=playground&utm_content=need-help", "_blank");
              return;
            }
            if (window.confirm("Need help by community?")) {
              window.open("https://discord.gg/xWPTJbmgNV", "_blank");
              return;
            }
            window.alert("If you find any bugs, please report them to our GitHub issues page.");
          }}
        >
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>


          Need help?
        </a>
      </nav>
    </div>
  );
}

export default Navigation;
