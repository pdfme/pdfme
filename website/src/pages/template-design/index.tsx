import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import {
  HelpOutline,
  ChangeCircleOutlined,
  UploadFileOutlined,
  FileDownloadOutlined,
  CodeOutlined,
  PreviewOutlined,
} from '@mui/icons-material';
import { generate, Designer, Template } from '../../../../src/index';
import { checkProps } from '../../../../src/libs/helper';
import Layout from '@theme/Layout';
import { getTemplate, cloneDeep } from '../../libs/helper';

const headerHeight = 60;
const controllHeight = 60;

const downloadJsonFile = (json: any, title: string) => {
  const blob = new Blob([JSON.stringify(json)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const readFile = (file: File | null, type: 'text' | 'dataURL' | 'arrayBuffer') => {
  return new Promise<string | ArrayBuffer>((r) => {
    const fileReader = new FileReader();
    fileReader.addEventListener('load', (e) => {
      if (e && e.target && e.target.result && file !== null) {
        r(e.target.result);
      }
    });
    if (file !== null) {
      if (type === 'text') {
        fileReader.readAsText(file);
      } else if (type === 'dataURL') {
        fileReader.readAsDataURL(file);
      } else if (type === 'arrayBuffer') {
        fileReader.readAsArrayBuffer(file);
      }
    }
  });
};

const getTemplateFromJsonFile = (file: File) => {
  return readFile(file, 'text').then((jsonStr) => {
    const template: Template = JSON.parse(jsonStr as string);
    try {
      checkProps(template, Template);
      return template;
    } catch (e) {
      throw e;
    }
  });
};

const modalBoxStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '1px solid #eee',
  borderRadius: 1,
  boxShadow: 24,
  p: 4,
};

const HowToUseButton = () => {
  const [open, setOpen] = React.useState(false);
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
          {/* TODO 実装 */}
          <h2>How to use</h2>
          <p>Duis mollis, est non commodo luctus, nisi erat porttitor ligula.</p>
        </Box>
      </Modal>
    </>
  );
};

const GetCodeButton = () => {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

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
          {/* TODO 実装 */}
          <h2>Get Code</h2>
          <p>Duis mollis, est non commodo luctus, nisi erat porttitor ligula.</p>
        </Box>
      </Modal>
    </>
  );
};

const TemplateDesign = () => {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);

  useEffect(() => {
    if (designerRef.current) {
      designer.current = new Designer({
        domContainer: designerRef.current,
        template: getTemplate(),
      });
      designer.current.onSaveTemplate(downloadTemplate);
    }
  }, [designerRef]);

  const changeBasePdf = (file: File) => {
    if (designer.current) {
      readFile(file, 'dataURL').then(async (basePdf: string) => {
        console.log('basePdf', basePdf);
        const template = Object.assign(cloneDeep(designer.current.getTemplate()), { basePdf });
        designer.current.updateTemplate(template);
      });
    }
  };

  const loadTemplate = (file: File) => {
    if (designer.current) {
      getTemplateFromJsonFile(file)
        .then((template) => {
          designer.current.updateTemplate(template);
        })
        .catch((e) => {
          alert(`Invalid template file.
--------------------------
${e}`);
        });
    }
  };

  const downloadTemplate = () => {
    if (designer.current) {
      downloadJsonFile(designer.current.getTemplate(), 'template');
    }
  };

  const generatePdf = async () => {
    if (designer.current) {
      const template = designer.current.getTemplate();
      const inputs = template.sampledata ?? [];
      const pdf = await generate({ template, inputs });
      const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob));
    }
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
          <GetCodeButton />
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
