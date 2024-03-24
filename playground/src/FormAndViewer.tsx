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

const headerHeight = 71;

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

function App() {
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

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: '0 1rem', fontSize: 'small' }}>
        <strong>Form, Viewer</strong>
        <span style={{ margin: "0 1rem" }}>:</span>
        <div>
          <input type="radio" onChange={onChangeMode} id="form" value="form" checked={mode === "form"} />
          <label htmlFor="form">Form</label>
          <input type="radio" onChange={onChangeMode} id="viewer" value="viewer" checked={mode === "viewer"} />
          <label htmlFor="viewer">Viewer</label>
        </div>
        <label style={{ width: 180 }}>
          Load Template
          <input type="file" accept="application/json" onChange={(e) => handleLoadTemplate(e, ui.current)} />
        </label>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={onGetInputs}>Get Inputs</button>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={onSetInputs}>Set Inputs</button>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={onSaveInputs}>Save Inputs</button>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={onResetInputs}>Reset Inputs</button>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={() => generatePDF(ui.current)}>Generate PDF</button>
      </header>
      <div ref={uiRef} style={{ width: '100%', height: `calc(100vh - ${headerHeight}px)` }} />
    </div>
  );
}

export default App;
