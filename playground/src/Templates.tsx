import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fromKebabCase } from "./helper"

function TemplatesApp({ isEmbedded }: { isEmbedded: boolean }) {
  const navigate = useNavigate();

  const [templateIds, setTemplateIds] = useState<string[]>([]);
  useEffect(() => {
    fetch('/template-assets/index.json')
      .then((response) => response.json())
      .then((data) => {
        setTemplateIds(data);
      });
  }, []);

  const navigateToDesigner = (templateId: string) => {
    if (isEmbedded) {
      window.parent.postMessage({ type: 'navigate', payload: { templateId } }, '*');
    } else {
      navigate(`/?template=${templateId}`)
    }
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900">Sample Templates</h2>
        <p className="mt-2 text-md text-gray-600">
          If you can’t find the template you’re looking for, or if you have any feedback on existing templates, you can request one or share your feedback{" "}
          <a
            href="https://github.com/pdfme/pdfme/discussions/670"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            here
          </a>
          .
        </p>
        <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
          {templateIds.map((templateId) => (
            <div key={templateId}>
              <div className="relative border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <div className="relative h-72 w-full overflow-hidden">
                  <img
                    onClick={() => { navigateToDesigner(templateId) }}
                    alt={fromKebabCase(templateId)}
                    src={`/template-assets/${templateId}/thumbnail.png`}
                    className="border border-gray-100 size-full object-contain cursor-pointer"
                  />
                </div>
                <div className="relative mt-4">
                  <h3
                    onClick={() => { navigateToDesigner(templateId) }}
                    className="text-md font-bold text-green-600 cursor-pointer hover:text-green-500"
                  >
                    {fromKebabCase(templateId)}
                  </h3>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => { navigateToDesigner(templateId) }}
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
