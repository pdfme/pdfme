import { useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cloneDeep, Template, checkTemplate, Lang } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplateById,
  getBlankTemplate,
  readFile,
  getPlugins,
  handleLoadTemplate,
  generatePDF,
  downloadJsonFile,
  translations,
} from "./helper";
import { NavBar, NavItem } from "./NavBar";

function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);


  const buildDesigner = useCallback(async () => {
    if (!designerRef.current) return;
    try {
      let template: Template = getBlankTemplate();
      const templateIdFromQuery = searchParams.get("template");
      searchParams.delete("template");
      setSearchParams(searchParams, { replace: true });
      const templateFromLocal = localStorage.getItem("template");

      if (templateIdFromQuery) {
        const templateJson = await getTemplateById(templateIdFromQuery);
        checkTemplate(templateJson);
        template = templateJson;

        if (!templateFromLocal || window.confirm("Would you like to overwrite the locally saved template?")) {
          localStorage.setItem("template", JSON.stringify(templateJson));
        }
      } else if (templateFromLocal) {
        const templateJson = JSON.parse(templateFromLocal) as Template;
        checkTemplate(templateJson);
        template = templateJson;
      }

      designer.current = new Designer({
        domContainer: designerRef.current,
        template,
        options: {
          font: getFontsData(),
          lang: 'en',
          labels: {
            'signature.clear': "🗑️",
          },
          theme: {
            token: {
              colorPrimary: "#25c2a0",
            },
          },
          icons: {
            multiVariableText:
              '<svg fill="#000000" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.643,13.072,17.414,2.3a1.027,1.027,0,0,1,1.452,0L20.7,4.134a1.027,1.027,0,0,1,0,1.452L9.928,16.357,5,18ZM21,20H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Z"/></svg>',
          },
        },
        plugins: getPlugins(),
      });
      designer.current.onSaveTemplate(onSaveTemplate);

    } catch {
      localStorage.removeItem("template");
    }
  }, []);

  const onChangeBasePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target && e.target.files) {
      readFile(e.target.files[0], "dataURL").then(async (basePdf) => {
        if (designer.current) {
          designer.current.updateTemplate(
            Object.assign(cloneDeep(designer.current.getTemplate()), {
              basePdf,
            })
          );
        }
      });
    }
  };

  const onDownloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), "template");
      console.log(designer.current.getTemplate());
    }
  };

  const onSaveTemplate = (template?: Template | undefined) => {
    if (designer.current) {
      localStorage.setItem(
        "template",
        JSON.stringify(template || designer.current.getTemplate())
      );
      alert("Saved!");
    }
  };

  useEffect(() => {
    if (designerRef.current) {
      buildDesigner();
    }
    return () => {
      if (designer.current) {
        designer.current.destroy();
      }
    }
  }, [designerRef, buildDesigner]);

  const navItems: NavItem[] = [
    {
      label: "Lang",
      content: (
        <select
          className="w-full border rounded px-2 py-1"
          onChange={(e) => {
            designer.current?.updateOptions({ lang: e.target.value as Lang });
          }}
        >
          {translations.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      ),
    },

    {
      label: "Change BasePDF",
      content: (
        <input
          type="file"
          accept="application/pdf"
          className="w-full text-sm border"
          onChange={onChangeBasePDF}
        />
      ),
    },
    {
      label: "Load Template",
      content: (
        <input
          type="file"
          accept="application/json"
          className="w-full text-sm border"
          onChange={(e) => handleLoadTemplate(e, designer.current)}
        />
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={onDownloadTemplate}
        >
          DL Template
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() => onSaveTemplate()}
        >
          Save Local
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() => {
            localStorage.removeItem("template");
            if (designer.current) {
              designer.current.updateTemplate(getBlankTemplate());
            }
          }}
        >
          Reset
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={() => generatePDF(designer.current)}
        >
          Generate PDF
        </button>
      ),
    },
  ];

  return (
    <>
      <NavBar items={navItems} />
      <div ref={designerRef} className="flex-1 w-full" />
    </>
  );
}

export default DesignerApp;
