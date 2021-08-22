import React, { useState } from "react";
import hljs from "highlight.js";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/vs2015.css";
import styles from "./index.module.scss";
import "./canva.css";
import Modal from "../Modal";
import Divider from "../Divider";
import readmeTop from "../../img/readme-top.png";
import visibility from "../../img/visibility.svg";
import help from "../../img/help.svg";
import code from "../../img/code.svg";
import save from "../../img/save.svg";
import pdf from "../../img/pdf.svg";
import download from "../../img/download_bk.svg";
import { Schema, TemplateEditorCtlProp, Template } from "../../types";
import {
  fmtTemplate,
  fmtTemplateForDev,
  copyTextToClipboard,
  canvaEdit,
  canvaCreate,
  designTypes,
} from "../../utils/";
import { CANVA_LINK } from "../../constants";

hljs.registerLanguage("javascript", javascript);

const getCode = (template: Template, schemas: Schema[][]) => {
  return `import labelmake from "labelmake";
(async () => {
  // You can also use Uint8Array or ArrayBuffer as a basePdf
  // const basePdf = fs.readFileSync("path/to/your.pdf")
  // const basePdf = await fetch("path/to/your.pdf").then((res) => res.arrayBuffer());
  const template = ${JSON.stringify(
    fmtTemplateForDev(template, schemas),
    null,
    "\t"
  )};
  const inputs = ${JSON.stringify(fmtTemplate(template, schemas).sampledata)};
  const pdf = await labelmake({ template, inputs });
  // Node
  fs.writeFileSync('path/to/your.pdf', pdf);
  // Browser
  // const blob = new Blob([pdf.buffer], { type: "application/pdf" });
  // document.getElementById("iframe").src = URL.createObjectURL(blob);
})();`;
};

const EditorCtl = ({
  processing,
  template,
  schemas,
  changeCanvaId,
  changeBasePdf,
  saveTemplate,
  previewPdf,
  downloadBasePdf,
  loadJsonTemplate,
}: TemplateEditorCtlProp) => {
  const [isOpenHelpModal, setIsOpenHelpModal] = useState(false);
  const [isOpenCodeModal, setIsOpenCodeModal] = useState(false);

  const templateCanvaId = template.canvaId;

  const onCanvaCreate = async (
    event: React.MouseEvent<HTMLSpanElement, MouseEvent>
  ) => {
    event.stopPropagation();
    canvaCreate(designTypes[0], (file, id) => {
      changeBasePdf(file);
      changeCanvaId(id);
    });
  };

  const onCanvaEdit = async (
    event: React.MouseEvent<HTMLSpanElement, MouseEvent>
  ) => {
    event.stopPropagation();
    if (templateCanvaId) {
      canvaEdit(templateCanvaId, (file, id) => {
        changeBasePdf(file);
        changeCanvaId(id);
      });
    }
  };

  return (
    <>
      <Modal
        open={isOpenCodeModal}
        cancelLabel="Close"
        title="Executable Code"
        actionLabel="Copy"
        onAction={() => {
          copyTextToClipboard(getCode(template, schemas));
          alert("Copied Clipboard!");
        }}
        onCancel={() => setIsOpenCodeModal(false)}
        onClose={() => setIsOpenCodeModal(false)}
      >
        <div>
          <pre className={styles.codeWrapper}>
            <code
              className="javascript hljs"
              style={{ tabSize: 2 }}
              dangerouslySetInnerHTML={{
                __html: hljs.highlight("javascript", getCode(template, schemas))
                  .value,
              }}
            ></code>
          </pre>
        </div>
      </Modal>

      <Modal
        title="How to Use"
        open={isOpenHelpModal}
        onClose={() => setIsOpenHelpModal(false)}
        onCancel={() => setIsOpenHelpModal(false)}
        cancelLabel="Close"
      >
        <div className="content" style={{ textAlign: "left" }}>
          <img src={readmeTop} alt="Concept" />
          <p>
            <u>
              Labelmake template is composed by setting{" "}
              <strong>Base PDF</strong> and <strong>fileds</strong>.
            </u>
            <br />・
            <u>
              <strong>Base PDF</strong> can design on{" "}
              <a target="_blank" rel="noreferrer" href={CANVA_LINK}>
                canva
              </a>{" "}
              or you can use your pdf file.
            </u>
            <br />・
            <u>
              <strong>Fileds</strong> can add from sidebar, and can edit like
              PowerPoint.
            </u>
            <br />
            You can save template as json, and load json template file.
          </p>
          <Divider />
          <div>
            <p style={{ margin: 0 }}>
              <strong>Keyboard shortcuts</strong>{" "}
              <span className="is-size-7">
                For the currently selected entry (light blue frame dot)
              </span>
            </p>
            <ul style={{ margin: "0 0 1rem 2rem" }}>
              <li>
                <span>
                  Move 1mm(Hold down the <kbd>shift</kbd> to move 0.1 mm)
                </span>
                ＝ <kbd>↑</kbd> , <kbd>→</kbd> , <kbd>↓</kbd> , <kbd>←</kbd>
              </li>
              <li>
                <span>Copy</span> ＝ ( <kbd>ctrl</kbd>or<kbd>⌘</kbd>) +
                <kbd>c</kbd>
              </li>
              <li>
                <span>Paste</span>＝( <kbd>ctrl</kbd> or <kbd>⌘</kbd>) +
                <kbd>v</kbd>
              </li>
              <li>
                <span>Delete</span>＝ <kbd>backspace</kbd> or <kbd>delete</kbd>
              </li>
              <li>
                <span>Undo</span> ＝( <kbd>ctrl</kbd> or <kbd>⌘</kbd>) +
                <kbd>z</kbd>
              </li>
              <li>
                <span>Redo</span>＝ <kbd>ctrl</kbd> +<kbd>y</kbd>
                or <kbd>⌘</kbd> + <kbd>shift</kbd>+<kbd>z</kbd>
              </li>
            </ul>
          </div>
        </div>
        <Divider />
      </Modal>
      <div className={`container ${styles.wrapper}`}>
        <div className={`desktop-flex ${styles.desktopFlex}`}>
          <div style={{ display: "flex", marginTop: "0.75rem" }}>
            <button
              style={{ margin: "0 0.5rem" }}
              className={`button is-small ${processing ? "is-loading" : ""}`}
              disabled={processing}
              onClick={() => setIsOpenHelpModal(true)}
            >
              <img src={help} alt={"Help"} />
              How to Use
            </button>
            <button
              className={`button is-small ${processing ? "is-loading" : ""}`}
              disabled={processing}
              onClick={previewPdf}
            >
              <img src={visibility} alt={"Preview"} />
              Preview
            </button>
            <div
              className={`dropdown is-right ${
                processing ? "" : "is-hoverable"
              }`}
            >
              <div className="dropdown-trigger">
                <button
                  id="pdfedit-button-introduction"
                  style={{ marginLeft: "0.5rem" }}
                  className="button is-small"
                  aria-haspopup="true"
                  aria-controls="dropdown-menu"
                >
                  <img src={pdf} alt={"背景PDF編集"} />
                  Base PDF
                </button>
              </div>
              <div
                className="dropdown-menu"
                id="dropdown-menu"
                role="menu"
                style={{ zIndex: 2001 }}
              >
                <div className="dropdown-content">
                  <div
                    style={{ borderBottom: "1px solid #eee", paddingLeft: 0 }}
                    className="dropdown-item is-size-7"
                    onClick={templateCanvaId ? onCanvaEdit : onCanvaCreate}
                  >
                    <span
                      style={{ border: "none", background: "none" }}
                      className="canva-btn canva-btn-theme-light canva-btn-size-s"
                    >
                      <span className="canva-btn-i"></span>
                      Design on Canva
                    </span>
                  </div>
                  <div className="dropdown-item is-size-7">
                    Change Base PDF
                    <input
                      className="file-input is-small"
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target && e.target.files) {
                          changeBasePdf(e.target.files[0]);
                        }
                      }}
                      onClick={(e) => {
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  <hr className="dropdown-divider" />
                  <div
                    className="dropdown-item is-size-7"
                    onClick={() => downloadBasePdf("basePdf")}
                  >
                    Download Base PDF
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: "0.75rem" }}>
            <button
              className={`button is-small is-light is-success ${
                processing ? "is-loading" : ""
              }`}
              disabled={processing}
            >
              <img src={download} alt={"Load Json Template"} />
              Load
              <input
                className="file-input is-small"
                type="file"
                accept="application/json"
                onChange={(e) => {
                  if (e.target && e.target.files && loadJsonTemplate) {
                    loadJsonTemplate(e.target.files[0]);
                  }
                }}
                onClick={(e) => {
                  e.currentTarget.value = "";
                }}
              />
            </button>
            <button
              className={`button is-light is-small is-info ${
                processing ? "is-loading" : ""
              }`}
              disabled={processing}
              onClick={() =>
                saveTemplate({ isSaveAs: false, template, schemas })
              }
            >
              <img src={save} alt={"Get Template as Json"} />
              Save
            </button>
            <button
              className={`button is-light is-small is-warning ${
                processing ? "is-loading" : ""
              }`}
              disabled={processing}
              onClick={() => setIsOpenCodeModal(true)}
            >
              <img src={code} alt={"Show Executable Code"} />
              Get Code
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorCtl;
