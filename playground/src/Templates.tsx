import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCopy } from 'lucide-react';
import { toast } from 'react-toastify';
import { fromKebabCase } from "./helper"
import ExternalButton from "./ExternalButton"

const CopyButton = ({ ui, name }: { ui: 'designer' | 'form-viewer', name: string }) => {
  const handleCopy = async () => {
    const shareableUrl = `https://pdfme.com/template-design?ui=${ui}&template=${name}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareableUrl;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        if (!document.execCommand("copy")) {
          throw new Error("Fallback: Copying text command was unsuccessful");
        }
        document.body.removeChild(textArea);
      }
      toast.info("Copied shareable link to clipboard", { position: "bottom-right" });
    } catch (error) {
      toast.error("Failed to copy shareable link", { position: "bottom-right" });
      console.error("Copy failed:", error);
    }
  };

  return (
    <button
      className="rounded-md border border-transparent bg-gray-100 p-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
      onClick={handleCopy}
      aria-label="Copy shareable link"
    >
      <ClipboardCopy size={20} />
    </button>
  );
};



function TemplatesApp({ isEmbedded }: { isEmbedded: boolean }) {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<{ name: string; author: string }[]>([]);
  const [avatarUrlMap, setAvatarUrlMap] = useState<{ [key: string]: string }>({});
  useEffect(() => {
    fetch('/template-assets/index.json')
      .then((response) => response.json())
      .then((data: { name: string; author: string }[]) => {
        setTemplates(data);
        const authors = new Set(data.map(({ author }) => author));
        const avatarUrlMap: { [key: string]: string } = {};
        Promise.all(
          Array.from(authors).map((author) =>
            fetch(`https://api.github.com/users/${author}`)
              .then((response) => response.json())
              .then((data) => {
                avatarUrlMap[author] = data.avatar_url;
              })
          )
        ).then(() => {
          setAvatarUrlMap(avatarUrlMap);
        });
      });
  }, []);

  const navigateToDesigner = (name: string) => {
    if (isEmbedded) {
      window.parent.postMessage({ type: 'navigate', payload: { name, ui: 'designer' } }, '*');
    } else {
      navigate(`/?template=${name}`)
    }
  }


  const navigateToFormViewer = (name: string) => {
    if (isEmbedded) {
      window.parent.postMessage({ type: 'navigate', payload: { name, ui: 'form-viewer' } }, '*');
    } else {
      navigate(`/form-viewer?template=${name}`)
    }
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Sample Templates</h2>
        <div className="lg:flex items-center border-b border-dashed border-gray-200 pb-2">
          <p className="mt-4 text-md text-gray-600">
            If you can’t find the template you need, you can request it on Github.

          </p>
          <div className="mt-4 ml-auto">
            <ExternalButton
              href="https://github.com/pdfme/pdfme/issues/new?template=template_request.yml&title={{TEMPLATE_NAME}}"
              title="Request a Template"
            />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
          {templates.map(({ name, author }) => (
            <div key={name}>
              <div className="relative border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div className="relative h-72 w-full overflow-hidden">
                  <img
                    onClick={() => { navigateToDesigner(name) }}
                    alt={fromKebabCase(name)}
                    src={`/template-assets/${name}/thumbnail.png`}
                    className="border border-gray-100 size-full object-contain cursor-pointer"
                  />
                </div>
                <div className="relative mt-4">
                  <h3
                    className="text-md font-bold text-green-600"
                  >
                    {fromKebabCase(name)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                    by{" "}
                    {avatarUrlMap[author] && <img
                      src={avatarUrlMap[author]}
                      alt={author}
                      className="inline-block w-10 h-10 rounded-full bg-gray-100"
                    />}
                    {" "}
                    <a
                      href={`https://github.com/${author}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-md font-bold hover:text-blue-400 transition duration-300"
                    >
                      {author}
                    </a>
                  </p>
                </div>
                <div className="mt-6">
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => { navigateToDesigner(name) }}
                      className="w-full relative flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-8 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                    >
                      Go to Designer
                    </button>
                    <CopyButton ui="designer" name={name} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => { navigateToFormViewer(name) }}
                      className="w-full relative flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-8 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                    >
                      Go to Form/Viewer
                    </button>
                    <CopyButton ui="form-viewer" name={name} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center">
            <div className="relative border-2 border-green-300 rounded-lg p-6 bg-green-50 shadow-md">
              <div className="relative mt-4">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://pdfme.com/docs/template-contribution-guide"
                  className="text-md font-extrabold text-green-700 underline decoration-green-400 hover:text-green-600 hover:decoration-green-500 transition duration-300"
                >
                  Contribute Your Template ❤️
                </a>
                <p className="mt-2 text-sm text-green-800 flex items-center gap-2 font-medium">
                  Share the templates you've created! Contributing your templates is extremely beneficial for other users.
                </p>
              </div>
              <div className="mt-6">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://pdfme.com/docs/template-contribution-guide"
                  className="w-full relative flex items-center justify-center rounded-md bg-gradient-to-r from-green-400 to-green-600 px-8 py-3 text-sm font-semibold text-white hover:opacity-90 transition duration-300"
                >
                  See Contribution Guide
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TemplatesApp;
