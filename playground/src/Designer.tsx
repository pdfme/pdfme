import { useRef, useState } from "react";
import { cloneDeep, Template, checkTemplate, Lang } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplatePresets,
  getTemplateByPreset,
  readFile,
  getPlugins,
  handleLoadTemplate,
  generatePDF,
  downloadJsonFile,
  translations,
} from "./helper";
import { NavBar, NavItem } from "./NavBar";

const initialTemplatePresetKey = "invoice";
const customTemplatePresetKey = "custom";

const templatePresets = getTemplatePresets();

function DesignerApp() {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [templatePreset, setTemplatePreset] = useState<string>(
    localStorage.getItem("templatePreset") || initialTemplatePresetKey
  );
  const [prevDesignerRef, setPrevDesignerRef] = useState<Designer | null>(null);

  const buildDesigner = () => {
    let template: Template = getTemplateByPreset(
      localStorage.getItem("templatePreset") || ""
    );
    try {
      const templateString = localStorage.getItem("template");
      if (templateString) {
        setTemplatePreset(customTemplatePresetKey);
      }

      const templateJson = templateString
        ? JSON.parse(templateString)
        : getTemplateByPreset(localStorage.getItem("templatePreset") || "");
      checkTemplate(templateJson);
      template = templateJson as Template;
    } catch {
      localStorage.removeItem("template");
    }

    getFontsData().then((font) => {
      if (designerRef.current) {
        designer.current = new Designer({
          domContainer: designerRef.current,
          template,
          options: {
            font,
            lang,
            labels: {
              clear: "🗑️",
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
        designer.current.onChangeTemplate(() => {
          setTemplatePreset(customTemplatePresetKey);
        });
      }
    });
  };

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

  const onChangeTemplatePresets = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTemplatePreset(e.target.value);
    localStorage.setItem(
      "template",
      JSON.stringify(
        getTemplateByPreset(localStorage.getItem("templatePreset") || "")
      )
    );
    localStorage.removeItem("template");
    localStorage.setItem("templatePreset", e.target.value);
    buildDesigner();
  };

  if (designerRef !== prevDesignerRef) {
    if (prevDesignerRef && designer.current) {
      designer.current.destroy();
    }
    buildDesigner();
    setPrevDesignerRef(designerRef);
  }

  const navItems: NavItem[] = [
    {
      label: "Template Preset",
      content: (
        <select
          className="w-full border rounded px-2 py-1"
          onChange={onChangeTemplatePresets}
          value={templatePreset}
        >
          {templatePresets.map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      label: "Lang",
      content: (
        <select
          className="w-full border rounded px-2 py-1"
          onChange={(e) => {
            setLang(e.target.value as Lang);
            designer.current?.updateOptions({ lang: e.target.value as Lang });
          }}
          value={lang}
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
          Download Template
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
          Save Template
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
