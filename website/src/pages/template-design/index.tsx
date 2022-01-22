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
import { generate, Designer, Viewer, Form, Template } from '../../../../src/index';
import Layout from '@theme/Layout';
import { getTemplate } from '../../libs/helper';

const headerHeight = 60;
const controllHeight = 60;

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

      designer.current.onSaveTemplate((t) => {
        console.log(t);
      });

      designer.current.onChangeTemplate(() => {
        designer.current.saveTemplate();
      });
    }
  }, [designerRef]);

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
          <button
            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              alert('TODO 実装');
            }}
            className="button button--sm button--outline button--success"
          >
            <ChangeCircleOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
            Change BasePDF
          </button>
          <button
            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              alert('TODO 実装');
            }}
            className="button button--sm button--outline button--info"
          >
            <UploadFileOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
            Load Template
          </button>
          <button
            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center' }}
            onClick={() => {
              alert('TODO 実装');
            }}
            className="button button--sm button--outline button--warning"
          >
            <FileDownloadOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
            Download Template
          </button>
          <GetCodeButton />
          <button
            style={{ display: 'flex', alignItems: 'center' }}
            onClick={() => {
              alert('TODO 実装');
            }}
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
