import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fromKebabCase } from "./helper"

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
      window.parent.postMessage({ type: 'navigate', payload: { name } }, '*');
    } else {
      navigate(`/?template=${name}`)
    }
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Sample Templates</h2>
        <div className="flex items-center border-b border-dashed border-gray-200 mt-4 pb-2">
          <p className="text-md text-gray-600">
            If you can’t find the template you need, you can request it on Github.
            
          </p>
          <a href="https://github.com/pdfme/pdfme/issues/new?template=template_request.yml" target="_blank" rel="noopener noreferrer" className="ml-auto">
            <button
              className="group relative inline-flex h-8 items-center justify-center rounded-md bg-green-600 px-4 font-semibold text-white hover:bg-green-700">
              <span>Request a Template</span>
              <div className="relative ml-1 h-5 w-5 overflow-hidden">
                <div className="absolute transition-all duration-200 group-hover:-translate-y-5 group-hover:translate-x-4">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <path d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9.00001C12 9.27615 11.7761 9.50001 11.5 9.50001C11.2239 9.50001 11 9.27615 11 9.00001V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                    </path>
                  </svg>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 -translate-x-4">
                    <path d="M3.64645 11.3536C3.45118 11.1583 3.45118 10.8417 3.64645 10.6465L10.2929 4L6 4C5.72386 4 5.5 3.77614 5.5 3.5C5.5 3.22386 5.72386 3 6 3L11.5 3C11.6326 3 11.7598 3.05268 11.8536 3.14645C11.9473 3.24022 12 3.36739 12 3.5L12 9.00001C12 9.27615 11.7761 9.50001 11.5 9.50001C11.2239 9.50001 11 9.27615 11 9.00001V4.70711L4.35355 11.3536C4.15829 11.5488 3.84171 11.5488 3.64645 11.3536Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                    </path>
                  </svg>
                </div>
              </div>
            </button>
          </a>
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
                    onClick={() => { navigateToDesigner(name) }}
                    className="text-md font-bold text-green-600 cursor-pointer hover:text-green-500"
                  >
                    {fromKebabCase(name)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                    by{" "}
                    <img
                      src={avatarUrlMap[author]}
                      alt={author}
                      className="inline-block w-5 h-5 rounded-full"
                    />{" "}
                    <a
                      href={`https://github.com/${author}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {author}
                    </a>
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => { navigateToDesigner(name) }}
                    className="w-full relative flex items-center justify-center rounded-md border border-transparent bg-gray-100 px-8 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
                  >
                    Go to Designer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TemplatesApp;
