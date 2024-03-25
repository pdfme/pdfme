import React, { useEffect, useRef, useState } from 'react';
import {
  ChangeCircleOutlined,
  UploadFileOutlined,
  FileDownloadOutlined,
  CodeOutlined,
  PreviewOutlined,
} from '@mui/icons-material';
import type { Template } from '@pdfme/common';
import { getInputFromTemplate } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { Designer } from '@pdfme/ui';
import { text, image, barcodes } from '@pdfme/schemas';
import Layout from '@theme/Layout';
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
} from '../libs/helper';
import HowToUseDesignerButton from '../components/HowToUseDesignerButton';
import DesignerCodeModal from '../components/DesignerCodeModal';

const headerHeight = 60;
const controllerHeight = 60;

const TemplateDesign = () => {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);
  const [template, setTemplate] = useState<Template>(getSampleTemplate());
  const [smallDisplay, setSmallDisplay] = useState(true);
  const [prevDesignerRef, setPrevDesignerRef] = useState<Designer | null>(null);

  const modes = ['generator', 'designer', 'form', 'viewer'];

  const [codeMode, setCodeMode] = useState<typeof modes[number]>('generator');
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const handleCodeModalOpen = () => setCodeModalOpen(true);
  const handleCodeModalClose = () => setCodeModalOpen(false);

  const code = (() => {
    if (codeMode === 'generator') {
      return getGeneratorSampleCode(template);
    } else if (codeMode === 'designer') {
      return getDesignerSampleCode(template);
    } else if (codeMode === 'form') {
      return getFormSampleCode(template);
    } else if (codeMode === 'viewer') {
      return getViewerSampleCode(template);
    }
  })();

  useEffect(() => {
    setSmallDisplay(window.innerWidth < 900);
  }, []);

  const buildDesigner = () => {
    if (designerRef.current) {
      designer.current = new Designer({
        domContainer: designerRef.current,
        template,
        plugins: { text, image, qrcode: barcodes.qrcode },
      });
      designer.current.onSaveTemplate(downloadTemplate);
      designer.current.onChangeTemplate(setTemplate);
    }
  };

  const changeBasePdf = (file: File) => {
    if (designer.current) {
      readFile(file, 'dataURL').then(async (basePdf: string) => {
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
    downloadJsonFile(designer.current.getTemplate(), 'template');
  };

  const generatePdf = async () => {
    const inputs = getInputFromTemplate(template)
    const pdf = await generate({
      template,
      plugins: { text, image, qrcode: barcodes.qrcode },
      inputs
    });
    const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob));
  };

  if (designerRef.current && designerRef != prevDesignerRef) {
    if (prevDesignerRef && designer.current) {
      designer.current.destroy();
    }
    buildDesigner();
    setPrevDesignerRef(designerRef);
  }

  return (
    <Layout title="Template Design">
      <div
        style={{
          height: controllerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
        }}
      >
        <HowToUseDesignerButton />
        {smallDisplay ? (
          <div className="dropdown dropdown--hoverable dropdown--right">
            <button className="button button--sm button--outline button--primary">...</button>
            <ul className="dropdown__menu">
              <li>
                <label style={{ display: 'flex', alignItems: 'center' }} className="dropdown__link">
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
              </li>
              <li>
                <label style={{ display: 'flex', alignItems: 'center' }} className="dropdown__link">
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
              </li>
              <li>
                <div
                  style={{ display: 'flex', alignItems: 'center' }}
                  onClick={downloadTemplate}
                  className="dropdown__link"
                >
                  <FileDownloadOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
                  Download Template
                </div>
              </li>
              <li>
                <div
                  style={{ display: 'flex', alignItems: 'center' }}
                  onClick={handleCodeModalOpen}
                  className="dropdown__link"
                >
                  <CodeOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
                  Get Code
                </div>
              </li>
              <li>
                <div
                  style={{ display: 'flex', alignItems: 'center' }}
                  onClick={generatePdf}
                  className="dropdown__link"
                >
                  <PreviewOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
                  Preview PDF
                </div>
              </li>
            </ul>
          </div>
        ) : (
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
            <div style={{ marginRight: '1rem' }}>
              <button
                style={{ display: 'flex', alignItems: 'center' }}
                className="button button--sm button--outline button--danger"
                onClick={handleCodeModalOpen}
              >
                <CodeOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
                Get Code
              </button>
            </div>
            <button
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={generatePdf}
              className="button button--sm button--outline button--secondary"
            >
              <PreviewOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
              Preview PDF
            </button>
          </div>
        )}
      </div>
      <div
        ref={designerRef}
        style={{ width: '100%', height: `calc(100vh - ${headerHeight + controllerHeight}px)` }}
      />
      <DesignerCodeModal
        code={code}
        open={codeModalOpen}
        handleClose={handleCodeModalClose}
        codeMode={codeMode}
        modes={modes}
        setCodeMode={setCodeMode}
      />
    </Layout>
  );
};

export default TemplateDesign;
