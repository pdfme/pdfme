import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import {
  HelpOutline,
  ChangeCircleOutlined,
  UploadFileOutlined,
  FileDownloadOutlined,
  CodeOutlined,
  PreviewOutlined,
  CloseOutlined,
} from '@mui/icons-material';
import { generate, Designer, Template } from '../../../../src/index';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
  getSampleTemplate,
  cloneDeep,
  downloadJsonFile,
  readFile,
  getTemplateFromJsonFile,
  getGeneratorSampleCode,
  getDesignerSampleCode,
  getFormSampleCode,
  getViewerSampleCode,
} from '../../libs/helper';
import Divider from '../../components/Divider';
import Code from '../../components/Code';

const headerHeight = 60;
const controllHeight = 60;

const modalBoxStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  border: '1px solid #eee',
  borderRadius: 1,
  boxShadow: 24,
};

const ModalHead = ({ title, handleClose }: { title: string; handleClose: () => void }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1rem',
    }}
  >
    <h2 style={{ marginBottom: 0 }}>{title}</h2>
    <button
      style={{ display: 'flex' }}
      className="button button--sm button--link"
      onClick={handleClose}
    >
      <CloseOutlined fontSize="small" />
    </button>
  </div>
);

const HowToUseButton = () => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <button
        style={{ display: 'flex', alignItems: 'center' }}
        className="button button--sm button--outline button--primary"
        onClick={handleOpen}
      >
        <HelpOutline fontSize="small" style={{ marginRight: '0.25rem' }} />
        How to use
      </button>
      <Modal open={open} onClose={handleClose}>
        <Box sx={modalBoxStyle}>
          <div style={{ maxWidth: '100vw', maxHeight: '100vh', overflow: 'auto', padding: '1rem' }}>
            <ModalHead title="How to use" handleClose={handleClose} />
            <img src={'/img/designer.gif'} />
            <p>
              The operation is based on Google Slides, etc., and you can use common keyboard
              shortcuts.
            </p>

            <Divider />
            <div>
              <p style={{ margin: 0 }}>
                <strong>Keyboard shortcuts</strong>
                <br />
                <span>For the currently selected entry (light blue frame dot)</span>
              </p>
              <ul>
                <li>
                  <span>
                    Move 1mm(Hold down the <kbd>shift</kbd> to move 0.1 mm)
                  </span>
                  ＝ <kbd>↑</kbd> , <kbd>→</kbd> , <kbd>↓</kbd> , <kbd>←</kbd>
                </li>
                <li>
                  <span>Copy</span> ＝ ( <kbd>ctrl</kbd>or<kbd>⌘</kbd>) +<kbd>c</kbd>
                </li>
                <li>
                  <span>Paste</span>＝( <kbd>ctrl</kbd> or <kbd>⌘</kbd>) +<kbd>v</kbd>
                </li>
                <li>
                  <span>Delete</span>＝ <kbd>backspace</kbd> or <kbd>delete</kbd>
                </li>
                <li>
                  <span>Undo</span> ＝( <kbd>ctrl</kbd> or <kbd>⌘</kbd>) +<kbd>z</kbd>
                </li>
                <li>
                  <span>Redo</span>＝ <kbd>ctrl</kbd> +<kbd>y</kbd>
                  or <kbd>⌘</kbd> + <kbd>shift</kbd>+<kbd>z</kbd>
                </li>
              </ul>
            </div>
            <Divider />
            <div>
              <p style={{ margin: 0 }}>
                <strong>About Template</strong>
              </p>
              <p>
                Templates are the core data structure of the pdfme library. It is JSON data that is
                easy to understand and has the properties basePdf and schemas.
              </p>

              <Link to="/docs/getting-started#template">
                <button className="button button--lg button--primary button--block">
                  Learn more about the Template
                </button>
              </Link>
            </div>
          </div>
        </Box>
      </Modal>
    </>
  );
};

const GetCodeButton = ({ template }: { template: Template }) => {
  const modes = ['generator', 'designer', 'form', 'viewer'];

  const [mode, setMode] = useState<typeof modes[number]>('generator');
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const code = (() => {
    if (mode === 'generator') {
      return getGeneratorSampleCode(template);
    } else if (mode === 'designer') {
      return getDesignerSampleCode(template);
    } else if (mode === 'form') {
      return getFormSampleCode(template);
    } else if (mode === 'viewer') {
      return getViewerSampleCode(template);
    }
  })();

  return (
    <>
      <button
        style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}
        className="button button--sm button--outline button--danger"
        onClick={handleOpen}
      >
        <CodeOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
        Get Code
      </button>
      <Modal open={open} onClose={handleClose}>
        <Box sx={modalBoxStyle}>
          <div style={{ maxWidth: '100vw', maxHeight: '100vh', overflow: 'auto', padding: '1rem' }}>
            <ModalHead title="Get Code" handleClose={handleClose} />
            <ul className="tabs tabs--block">
              {modes.map((m) => (
                <li
                  key={m}
                  onClick={() => setMode(m)}
                  className={`tabs__item ${mode === m ? 'tabs__item--active' : ''}`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </li>
              ))}
            </ul>
            <div style={{ maxHeight: '80vh', overflow: 'auto' }}>
              <Code code={code} language="typescript" />
            </div>
          </div>
        </Box>
      </Modal>
    </>
  );
};

const TemplateDesign = () => {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const [template, setTemplate] = useState<Template>(getSampleTemplate());

  useEffect(() => {
    if (designerRef.current) {
      designer.current = new Designer({ domContainer: designerRef.current, template });
      designer.current.onSaveTemplate(downloadTemplate);
      designer.current.onChangeTemplate(setTemplate);
    }
  }, [designerRef]);

  const changeBasePdf = (file: File) => {
    if (designer.current) {
      readFile(file, 'dataURL').then(async (basePdf: string) => {
        // TODO updateTemplateでコールバックが発火しないので、発火するようにする
        designer.current.updateTemplate(Object.assign(cloneDeep(template), { basePdf }));
      });
    }
  };

  const loadTemplate = (file: File) => {
    if (designer.current) {
      getTemplateFromJsonFile(file)
        .then((t) => {
          designer.current.updateTemplate(t);
        })
        .catch((e) => {
          alert(`Invalid template file.
--------------------------
${e}`);
        });
    }
  };

  const downloadTemplate = () => {
    downloadJsonFile(template, 'template');
  };

  const generatePdf = async () => {
    const inputs = template.sampledata ?? [];
    const pdf = await generate({ template, inputs });
    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob));
  };

  return (
    <Layout title="Template Design">
      <div
        style={{
          height: controllHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
        }}
      >
        <div>
          <HowToUseButton />
        </div>
        <div style={{ display: 'flex' }}>
          <label
            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}
            className="button button--sm button--outline button--success"
          >
            <ChangeCircleOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
            Change BasePDF
            <input
              style={{ display: 'none' }}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                if (e.target && e.target.files) {
                  changeBasePdf(e.target.files[0]);
                }
              }}
              onClick={(e) => {
                e.currentTarget.value = '';
              }}
            />
          </label>

          <label
            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}
            className="button button--sm button--outline button--info"
          >
            <UploadFileOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
            Load Template
            <input
              style={{ display: 'none' }}
              type="file"
              accept="application/json"
              onChange={(e) => {
                if (e.target && e.target.files) {
                  loadTemplate(e.target.files[0]);
                }
              }}
              onClick={(e) => {
                e.currentTarget.value = '';
              }}
            />
          </label>
          <button
            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}
            onClick={downloadTemplate}
            className="button button--sm button--outline button--warning"
          >
            <FileDownloadOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
            Download Template
          </button>
          <GetCodeButton template={template} />
          <button
            style={{ display: 'flex', alignItems: 'center' }}
            onClick={generatePdf}
            className="button button--sm button--outline button--secondary"
          >
            <PreviewOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
            Preview PDF
          </button>
        </div>
      </div>

      <div
        ref={designerRef}
        style={{
          width: '100%',
          height: `calc(100vh - ${headerHeight + controllHeight}px)`,
        }}
      ></div>
    </Layout>
  );
};

export default TemplateDesign;
