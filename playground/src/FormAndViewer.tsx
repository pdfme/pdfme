import { useRef, useState } from "react";
import { Template, checkTemplate, getInputFromTemplate } from "@pdfme/common";
import { Form, Viewer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplateByPreset,
  handleLoadTemplate,
  generatePDF,
  getPlugins,
  isJsonString,
} from "./helper";
import { NavItem, NavBar } from "./NavBar";

type Mode = "form" | "viewer";



const initTemplate = () => {
  let template: Template = getTemplateByPreset(localStorage.getItem('templatePreset') || "")
  try {
    const templateString = localStorage.getItem("template");
    if (!templateString) {
      return template;
    }
    const templateJson = JSON.parse(templateString)
    checkTemplate(templateJson);
    template = templateJson as Template;
  } catch {
    localStorage.removeItem("template");
  }
  return template;
};

function FormAndViewerApp() {
  const uiRef = useRef<HTMLDivElement | null>(null);
  const ui = useRef<Form | Viewer | null>(null);
  const [prevUiRef, setPrevUiRef] = useState<Form | Viewer | null>(null);


  const [mode, setMode] = useState<Mode>(
    (localStorage.getItem("mode") as Mode) ?? "form"
  );

  const buildUi = (mode: Mode) => {
    const template = initTemplate();
    let inputs = getInputFromTemplate(template);
    try {
      const inputsString = localStorage.getItem("inputs");
      if (inputsString) {
        const inputsJson = JSON.parse(inputsString);
        inputs = inputsJson;
      }
    } catch {
      localStorage.removeItem("inputs");
    }

    getFontsData().then((font) => {
      if (uiRef.current) {
        ui.current = new (mode === "form" ? Form : Viewer)({
          domContainer: uiRef.current,
          template,
          inputs,
          options: {
            font,
            lang: 'ja',
            labels: { 'clear': '消去' },
            theme: {
              token: {
                colorPrimary: '#25c2a0',
              },
            },
          },
          plugins: getPlugins(),
        });
      }
    });
  };

  const onChangeMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as Mode;
    setMode(value);
    localStorage.setItem("mode", value);
    buildUi(value);
  };

  const onGetInputs = () => {
    if (ui.current) {
      const inputs = ui.current.getInputs();
      alert(JSON.stringify(inputs, null, 2));
      alert("Dumped as console.log");
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
      alert("Saved!");
    }
  };

  const onResetInputs = () => {
    localStorage.removeItem("inputs");
    if (ui.current) {
      const template = initTemplate();
      ui.current.setInputs(getInputFromTemplate(template));
    }
  };

  if (uiRef != prevUiRef) {
    if (prevUiRef && ui.current) {
      ui.current.destroy();
    }
    buildUi(mode);
    setPrevUiRef(uiRef);
  }

  const navItems: NavItem[] = [
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
          className="w-full text-sm border"
        />
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onGetInputs}>
          Get Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onSetInputs}>
          Set Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onSaveInputs}>
          Save Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button className="px-2 py-1 border" onClick={onResetInputs}>
          Reset Inputs
        </button>
      ),
    },
    {
      label: "",
      content: (
        <button
          className="px-2 py-1 border"
          onClick={() => generatePDF(ui.current)}
        >
          Generate PDF
        </button>
      ),
    },
  ];

  return (
    <>
      <NavBar items={navItems} />
      <div ref={uiRef} className="flex-1 w-full" />
    </>
  );
}

export default FormAndViewerApp;
