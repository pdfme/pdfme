import React, { useRef, useEffect, useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from 'react-toastify';
import { cloneDeep, Template, checkTemplate, Lang, isBlankPdf } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplateById,
  getBlankTemplate,
  readFile,
  handleLoadTemplate,
  generatePDF,
  downloadJsonFile,
  translations,
} from "../helper";
import { getPlugins } from '../plugins';
import { NavBar, NavItem } from "../components/NavBar";
import ExternalButton from "../components/ExternalButton";

function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);

  const [editingStaticSchemas, setEditingStaticSchemas] = useState(false);
  const [originalTemplate, setOriginalTemplate] = useState<Template | null>(null);

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
        if (!templateFromLocal) {
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
            token: { colorPrimary: "#25c2a0" },
          },
          icons: {
            multiVariableText:
              '<svg fill="#000000" width="24px" height="24px" viewBox="0 0 24 24"><path d="M6.643,13.072,17.414,2.3a1.027,1.027,0,0,1,1.452,0L20.7,4.134a1.027,1.027,0,0,1,0,1.452L9.928,16.357,5,18ZM21,20H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Z"/></svg>',
          },
          maxZoom: 250,
        },
        plugins: getPlugins(),
      });
      designer.current.onSaveTemplate(onSaveTemplate);

    } catch (error) {
      localStorage.removeItem("template");
      console.error(error);
    }
  }, [searchParams, setSearchParams]);

  const onChangeBasePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      readFile(e.target.files[0], "dataURL").then(async (basePdf) => {
        if (designer.current) {
          const newTemplate = cloneDeep(designer.current.getTemplate());
          newTemplate.basePdf = basePdf;
          designer.current.updateTemplate(newTemplate);
        }
      });
    }
  };

  const onDownloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), "template");
      toast.success(
        <div>
          <p>Can you share the template you created? ❤️</p>
          <a
            className="text-blue-500 underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://pdfme.com/docs/template-contribution-guide"
          >
            See: Template Contribution Guide
          </a>
        </div>
      );
    }
  };

  const onSaveTemplate = (template?: Template) => {
    if (designer.current) {
      localStorage.setItem(
        "template",
        JSON.stringify(template || designer.current.getTemplate())
      );
      toast.success("Saved on local storage");
    }
  };

  const onResetTemplate = () => {
    localStorage.removeItem("template");
    if (designer.current) {
      designer.current.updateTemplate(getBlankTemplate());
    }
  };

  const toggleEditingStaticSchemas = () => {
    if (!designer.current) return;

    if (!editingStaticSchemas) {
      const currentTemplate = cloneDeep(designer.current.getTemplate());
      if (!isBlankPdf(currentTemplate.basePdf)) {
        toast.error(<div>
          <p>The current template cannot edit the static schema.</p>
          <a
            className="text-blue-500 underline"
            target="_blank"
            rel="noopener noreferrer"
            href="https://pdfme.com/docs/headers-and-footers"
          >
            See: Headers and Footers
          </a>
        </div>);
        return;
      }

      setOriginalTemplate(currentTemplate);

      const { width, height } = currentTemplate.basePdf;
      const staticSchema = currentTemplate.basePdf.staticSchema || [];
      designer.current.updateTemplate({
        ...currentTemplate,
        schemas: [staticSchema],
        basePdf: { width, height, padding: [0, 0, 0, 0] },
      });

      setEditingStaticSchemas(true);

    } else {
      const editedTemplate = designer.current.getTemplate();
      if (!originalTemplate) return;
      const merged = cloneDeep(originalTemplate);
      if (!isBlankPdf(merged.basePdf)) {
        toast.error("Invalid basePdf format");
        return;
      }

      merged.basePdf.staticSchema = editedTemplate.schemas[0];
      designer.current.updateTemplate(merged);

      setOriginalTemplate(null);
      setEditingStaticSchemas(false);
    }
  };

  useEffect(() => {
    if (designerRef.current) {
      buildDesigner();
    }
    return () => {
      designer.current?.destroy();
    };
  }, [designerRef, buildDesigner]);

  const navItems: NavItem[] = [
    {
      label: "Lang",
      content: (
        <select
          disabled={editingStaticSchemas}
          className={`w-full border rounded px-2 py-1 ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
            }`}
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
          disabled={editingStaticSchemas}
          type="file"
          accept="application/pdf"
          className={`w-full text-sm border rounded ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
            }`}
          onChange={onChangeBasePDF}
        />
      ),
    },
    {
      label: "Load Template",
      content: (
        <input
          disabled={editingStaticSchemas}
          type="file"
          accept="application/json"
          className={`w-full text-sm border rounded ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
            }`}
          onChange={(e) => handleLoadTemplate(e, designer.current)}
        />
      ),
    },
    {
      label: "Edit static schema",
      content: (
        <button
          className={`px-2 py-1 border rounded hover:bg-gray-100 w-full disabled:opacity-50 disabled:cursor-not-allowed`}
          onClick={toggleEditingStaticSchemas}
        >
          {editingStaticSchemas ? "End editing" : "Start editing"}
        </button>
      ),
    },
    {
      label: "",
      content: (
        <div className="flex gap-2">
          <button
            id="save-local"
            disabled={editingStaticSchemas}
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={() => onSaveTemplate()}
          >
            Save Local
          </button>
          <button
            id="reset-template"
            disabled={editingStaticSchemas}
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={onResetTemplate}
          >
            Reset
          </button>
        </div>
      ),
    },
    {
      label: "",
      content: (
        <div className="flex gap-2">
          <button
            disabled={editingStaticSchemas}
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={onDownloadTemplate}
          >
            DL Template
          </button>
          <button
            id="generate-pdf"
            disabled={editingStaticSchemas}
            className={`px-2 py-1 border rounded hover:bg-gray-100 w-full ${editingStaticSchemas ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={async () => {
              const startTimer = performance.now();
              await generatePDF(designer.current);
              const endTimer = performance.now();
              toast.info(`Generated PDF in ${Math.round(endTimer - startTimer)}ms ⚡️`);
            }}
          >
            Generate PDF
          </button>
        </div>
      ),
    },
    {
      label: "",
      content: React.createElement(ExternalButton, {
        href: "https://github.com/pdfme/pdfme/issues/new?template=template_feedback.yml&title=TEMPLATE_NAME",
        title: "Feedback this template"
      }),
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
