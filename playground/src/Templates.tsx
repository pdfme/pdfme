import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fromKebabCase } from "./helper"
import ExternalButton from "./ExternalButton"

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
                    onClick={() => { navigateToDesigner(name) }}
                    className="text-md font-bold text-green-600 cursor-pointer hover:text-green-500"
                  >
                    {fromKebabCase(name)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                    by{" "}
                    {avatarUrlMap[author] && <img
                      src={avatarUrlMap[author]}
                      alt={author}
                      className="inline-block w-5 h-5 rounded-full"
                    />}
                    {" "}
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
