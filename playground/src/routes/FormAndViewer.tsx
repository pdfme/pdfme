import React, { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from 'react-toastify';
import { Template, checkTemplate, getInputFromTemplate, Lang } from "@pdfme/common";
import { Form, Viewer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplateById,
  getBlankTemplate,
  handleLoadTemplate,
  generatePDF,
  isJsonString,
  translations,
} from "../helper";
import { getPlugins } from '../plugins';
import { NavItem, NavBar } from "../components/NavBar";
import ExternalButton from "../components/ExternalButton";

type Mode = "form" | "viewer";


function FormAndViewerApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const uiRef = useRef<HTMLDivElement | null>(null);
  const ui = useRef<Form | Viewer | null>(null);

  const [mode, setMode] = useState<Mode>(
    (localStorage.getItem("mode") as Mode) ?? "form"
  );

  const buildUi = useCallback(async (mode: Mode) => {
    if (!uiRef.current) return;
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

      let inputs = getInputFromTemplate(template);
      const inputsString = localStorage.getItem("inputs");
      if (inputsString) {
        const inputsJson = JSON.parse(inputsString);
        inputs = inputsJson;
      }

      ui.current = new (mode === "form" ? Form : Viewer)({
        domContainer: uiRef.current,
        template,
        inputs,
        options: {
          font: getFontsData(),
          lang: 'en',
          labels: { 'signature.clear': 'Clear' },
          theme: {
            token: {
              colorPrimary: '#25c2a0',
            },
          },
        },
        plugins: getPlugins(),
      });
    } catch {
      localStorage.removeItem("inputs");
      localStorage.removeItem("template");
    }
  }, [searchParams, setSearchParams]);

  const onChangeMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as Mode;
    setMode(value);
    localStorage.setItem("mode", value);
    buildUi(value);
  };

  const onGetInputs = () => {
    if (ui.current) {
      const inputs = ui.current.getInputs();
      toast.info("Dumped as console.log");
      console.log(inputs);
    }
  };

  const onSetInputs = () => {
    if (ui.current) {
      const prompt = window.prompt("Enter Inputs JSONString") || "";
      try {
        const json = isJsonString(prompt) ? JSON.parse(prompt) : [{}];
        ui.current.setInputs(json);
      } catch (e) {
        alert(e);
      }
    }
  };

  const onSaveInputs = () => {
    if (ui.current) {
      const inputs = ui.current.getInputs();
      localStorage.setItem("inputs", JSON.stringify(inputs));
      toast.success("Saved on local storage");
    }
  };

  const onResetInputs = () => {
    localStorage.removeItem("inputs");
    if (ui.current) {
      const template = ui.current.getTemplate();
      ui.current.setInputs(getInputFromTemplate(template));
    }
  };

  useEffect(() => {
    buildUi(mode);
    return () => {
      if (ui.current) {
        ui.current.destroy();
      }
    };
  }, [mode, uiRef, buildUi]);

  const navItems: NavItem[] = [
    {
      label: "Lang",
      content: (
        <select
          className="w-full border rounded px-2 py-1"
          onChange={(e) => {
            ui.current?.updateOptions({ lang: e.target.value as Lang });
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
      label: "Mode",
      content: (
        <div className="mt-2">
          <input
            type="radio"
            id="form"
            value="form"
            checked={mode === "form"}
            onChange={onChangeMode}
          />
          <label htmlFor="form" className="mr-2"> Form </label>
          <input
            type="radio"
            id="viewer"
            value="viewer"
            checked={mode === "viewer"}
            onChange={onChangeMode}
          />
          <label htmlFor="viewer"> Viewer </label>
        </div>
      ),
    },
    {
      label: "Load Template",
      content: (
        <input
          type="file"
          accept="application/json"
          onChange={(e) => handleLoadTemplate(e, ui.current)}
          className="w-full text-sm border rounded"
        />
      ),
    },
    {
      label: "",
      content: (
        <div className="flex gap-2">
          <button
            className="px-2 py-1 border rounded hover:bg-gray-100"
            onClick={onGetInputs}>
            Get Inputs
          </button>
          <button
            className="px-2 py-1 border rounded hover:bg-gray-100"
            onClick={onSetInputs}>
            Set Inputs
          </button>
        </div>
      ),
    },
    {
      label: "",
      content: (
        <div className="flex gap-2">

          <button
            className="px-2 py-1 border rounded hover:bg-gray-100"
            onClick={onSaveInputs}>
            Save Inputs
          </button>
          <button
            className="px-2 py-1 border rounded hover:bg-gray-100"
            onClick={onResetInputs}>
            Reset Inputs
          </button>
        </div>

      ),
    },
    {
      label: "",
      content: (
        <button
          id="generate-pdf"
          className="px-2 py-1 border rounded hover:bg-gray-100"
          onClick={async () => {
            const startTimer = performance.now()
            await generatePDF(ui.current);
            const endTimer = performance.now()
            toast.info(`Generated PDF in ${Math.round(endTimer - startTimer)}ms ⚡️`);
          }}
        >
          Generate PDF
        </button>
      ),
    },
    {
      label: "",
      content: React.createElement(ExternalButton, {
        href: "https://github.com/pdfme/pdfme/issues/new?template=template_feedback.yml&title=TEMPLATE_NAME",
        title: "Feedback this template"
      })
    }
  ];

  return (
    <>
      <NavBar items={navItems} />
      <div ref={uiRef} className="flex-1 w-full" />
    </>
  );
}

export default FormAndViewerApp;
