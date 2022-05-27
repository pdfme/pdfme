import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import { HelpOutline, ChangeCircleOutlined } from '@mui/icons-material';
import Link from '@docusaurus/Link';
import ModalHead from './ModalHead';
import Divider from './Divider';

const modalBoxStyle = {
  position: 'absolute',
  minWidth: '70%',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  border: '1px solid #eee',
  borderRadius: 1,
  boxShadow: 24,
};

const HowToUseDesignerButton = () => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <div>
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
          <div
            style={{
              maxWidth: '100vw',
              maxHeight: '100vh',
              overflow: 'auto',
              padding: '1rem',
              backgroundColor: 'var(--ifm-navbar-background-color)',
            }}
          >
            <ModalHead title="How to use" handleClose={handleClose} />
            <div style={{ background: '#999' }}>
              <img
                loading="lazy"
                src={'/img/designer.gif'}
                style={{ width: 400, height: 384, display: 'block', margin: '0 auto' }}
              />
            </div>
            <p>
              The operation is like Google Slides, etc., so you can use common keyboard shortcuts.
            </p>

            <p>
              Let's Click{' '}
              <label
                style={{ display: 'inline-flex', alignItems: 'center' }}
                className="button button--sm button--outline button--success"
              >
                <ChangeCircleOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
                Change BasePDF
              </label>{' '}
              to change the background PDF, and click{' '}
              <button
                style={{
                  padding: '0.5rem',
                  color: 'rgb(255, 255, 255)',
                  background: 'rgb(24, 160, 251)',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
              >
                <strong>Add new field</strong>
              </button>{' '}
              in the sidebar to place the fields and create the template!
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
              <p>Templates are the core data structure of the pdfme library.</p>

              <Link to="/docs/getting-started#template">
                <button className="button button--lg button--primary button--block">
                  Learn more about the Template
                </button>
              </Link>
            </div>
          </div>
        </Box>
      </Modal>
    </div>
  );
};

export default HowToUseDesignerButton;
