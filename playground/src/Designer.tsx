import { useRef, useState } from "react";
import { Template, checkTemplate, Lang } from "@pdfme/common";
import { Designer } from "@pdfme/ui";
import {
  getFontsData,
  getTemplatePresets,
  getTemplateByPreset,
  readFile,
  cloneDeep,
  getPlugins,
  handleLoadTemplate,
  generatePDF,
  downloadJsonFile,
} from "./helper";

const headerHeight = 65;

const initialTemplatePresetKey = "invoice"
const customTemplatePresetKey = "custom";

const templatePresets = getTemplatePresets();


const translations: { label: string, value: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'th', label: 'Thai' },
  { value: 'pl', label: 'Polish' },
  { value: 'it', label: 'Italian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
]

function App() {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [templatePreset, setTemplatePreset] = useState<string>(localStorage.getItem("templatePreset") || initialTemplatePresetKey);
  const [prevDesignerRef, setPrevDesignerRef] = useState<Designer | null>(null);

  const buildDesigner = () => {
    let template: Template = getTemplateByPreset(localStorage.getItem('templatePreset') || "");
    try {
      const templateString = localStorage.getItem("template");
      if (templateString) {
        setTemplatePreset(customTemplatePresetKey);
      }

      const templateJson = templateString
        ? JSON.parse(templateString)
        : getTemplateByPreset(localStorage.getItem('templatePreset') || "");
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
              'clear': '🗑️', // Add custom labels to consume them in your own plugins
            },
            theme: {
              token: {
                colorPrimary: '#25c2a0',
              },
            },
          },
          plugins: getPlugins(),
        });
        designer.current.onSaveTemplate(onSaveTemplate);
        designer.current.onChangeTemplate(() => {
          setTemplatePreset(customTemplatePresetKey);
        })
      }
    });
  }

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

  const onSaveTemplate = (template?: Template) => {
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
    localStorage.setItem("template", JSON.stringify(getTemplateByPreset(localStorage.getItem('templatePreset') || "")));
    localStorage.removeItem("template");
    localStorage.setItem("templatePreset", e.target.value);
    buildDesigner();
  }

  if (designerRef != prevDesignerRef) {
    if (prevDesignerRef && designer.current) {
      designer.current.destroy();
    }
    buildDesigner();
    setPrevDesignerRef(designerRef);
  }

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: '0 1rem', fontSize: 'small' }}>
        <strong>Designer</strong>
        <span style={{ margin: "0 1rem" }}>:</span>
        <label>
          Template Preset:{" "}
          <select onChange={onChangeTemplatePresets} value={templatePreset}>
            {templatePresets.map((preset) => (
              <option key={preset.key}
                disabled={preset.key === customTemplatePresetKey}
                value={preset.key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <span style={{ margin: "0 1rem" }}>/</span>
        <label>
          Lang:{" "}
          <select onChange={(e) => {
            setLang(e.target.value as Lang)
            if (designer.current) {
              designer.current.updateOptions({ lang: e.target.value as Lang })
            }
          }} value={lang}>
            {translations.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
        <span style={{ margin: "0 1rem" }}>/</span>
        <label style={{ width: 180 }}>
          Change BasePDF
          <input type="file" accept="application/pdf" onChange={onChangeBasePDF} />
        </label>
        <span style={{ margin: "0 1rem" }}>/</span>
        <label style={{ width: 180 }}>
          Load Template
          <input type="file" accept="application/json" onChange={(e) => {
            handleLoadTemplate(e, designer.current);
            setTemplatePreset(customTemplatePresetKey);
          }} />
        </label>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={onDownloadTemplate}>Download Template</button>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={() => onSaveTemplate()}>Save Template</button>
        <span style={{ margin: "0 1rem" }}>/</span>
        <button onClick={() => generatePDF(designer.current)}>Generate PDF</button>
      </header>
      <div ref={designerRef} style={{ width: '100%', height: `calc(100vh - ${headerHeight}px)` }} />
    </div>
  );
}

export default App;
