import { useRef, useEffect, useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from 'react-toastify';
import { cloneDeep, Template, checkTemplate, Lang } from "@pdfme/common";
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
import ExternalButton from "../components/ExternalButton"

/*
MEMO
- [x]  Edit static schemasボタンを押すとテンプレートが切り替わる
    1. Designerのテンプレートをアップデートしてstatic schemasをテンプレートとして利用する
    2. basePdfとしてはpadding: 0, sizeはbasePdfから取得したものを使おう
- [x]  Edit static schemasボタンを → End editing static schemas にする
    1. 他のボタンは非活性にした方がいいかも？
    2. ↑ editing static schemasモードと呼ぼう
- [x]  End editing static schemas をクリックしたらモードを抜けてもとのテンプレートとマージする
*/

function DesignerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);

  // static schemas用の編集モードと元テンプレートを管理
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

    } catch {
      localStorage.removeItem("template");
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
      toast.dismiss();
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
        </div>,
        {
          position: "bottom-right",
          autoClose: 10000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        }
      );
    }
  };

  const onSaveTemplate = (template?: Template) => {
    if (designer.current) {
      localStorage.setItem(
        "template",
        JSON.stringify(template || designer.current.getTemplate())
      );
      alert("Saved!");
    }
  };

  const onResetTemplate = () => {
    localStorage.removeItem("template");
    if (designer.current) {
      designer.current.updateTemplate(getBlankTemplate());
    }
  };

  // staticSchemas編集用のフロー
  const toggleEditingStaticSchemas = () => {
    if (!designer.current) return;

    if (!editingStaticSchemas) {
      // 「Edit Static Schemas」をクリックした場合: 編集モード開始
      const currentTemplate = cloneDeep(designer.current.getTemplate());
      setOriginalTemplate(currentTemplate);

      // basePdfのタイプがオブジェクトか確認 (width, height, paddingがある)
      if (typeof currentTemplate.basePdf !== "object") {
        alert("staticSchemaは basePdf を既存PDFではなく width/heightで指定している場合のみ利用できます。");
        return;
      }

      // staticSchemaをschemasとして編集できるようにする
      const { width, height } = currentTemplate.basePdf;
      const staticSchema = currentTemplate.basePdf.staticSchema || [];

      const editingTemplate: Template = {
        ...currentTemplate,
        // DesignerのschemasとしてstaticSchemaを設定
        schemas: [staticSchema],
        // basePdfはwidth, heightのみ継承し、paddingは0に
        basePdf: {
          width,
          height,
          padding: [0, 0, 0, 0],
        },
      };
      // 一旦 staticSchema は取り除く (編集対象はschemasに)
      delete editingTemplate.basePdf.staticSchema;

      designer.current.updateTemplate(editingTemplate);
      setEditingStaticSchemas(true);

    } else {
      // 「End Editing Static Schemas」をクリックした場合: 編集モード終了
      const editedTemplate = designer.current.getTemplate();
      if (!originalTemplate) return;

      // schemasに反映されたstaticSchemaを元のtemplateへマージ
      const merged = cloneDeep(originalTemplate);
      if (typeof merged.basePdf === "object") {
        merged.basePdf.staticSchema = editedTemplate.schemas[0];
      }
      // Designerを元のベースPDFを使ったテンプレートに戻す
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
      // staticSchemas編集中はdisable
      content: (
        <select
          disabled={editingStaticSchemas}
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
          disabled={editingStaticSchemas}
          type="file"
          accept="application/pdf"
          className="w-full text-sm border rounded"
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
          className="w-full text-sm border rounded"
          onChange={(e) => handleLoadTemplate(e, designer.current)}
        />
      ),
    },
    // Edit static schemasボタン
    {
      label: editingStaticSchemas ? "End editing static schemas" : "Edit static schemas",
      content: (
        <button
          className="px-2 py-1 border rounded hover:bg-gray-100 w-full"
          onClick={toggleEditingStaticSchemas}
        >
          {editingStaticSchemas ? "End editing static schemas" : "Edit static schemas"}
        </button>
      ),
    },
    {
      label: "",
      content: (
        <div className="flex gap-2">
          <button
            disabled={editingStaticSchemas}
            className="px-2 py-1 border rounded hover:bg-gray-100"
            onClick={() => onSaveTemplate()}
          >
            Save Local
          </button>
          <button
            disabled={editingStaticSchemas}
            className="px-2 py-1 border rounded hover:bg-gray-100"
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
            className="px-2 py-1 border rounded hover:bg-gray-100"
            onClick={onDownloadTemplate}
          >
            DL Template
          </button>
          <button
            disabled={editingStaticSchemas}
            className="px-2 py-1 border rounded hover:bg-gray-100"
            onClick={async () => {
              const startTimer = performance.now();
              await generatePDF(designer.current);
              const endTimer = performance.now();
              toast.dismiss();
              toast.info(`Generated PDF in ${Math.round(endTimer - startTimer)}ms ⚡️`, {
                position: "bottom-right",
              });
            }}
          >
            Generate PDF
          </button>
        </div>
      ),
    },
    {
      label: "",
      content: (
        <ExternalButton
          // disabled={editingStaticSchemas}
          href="https://github.com/pdfme/pdfme/issues/new?template=template_feedback.yml&title={{TEMPLATE_NAME}}"
          title="Feedback this template"
        />
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
