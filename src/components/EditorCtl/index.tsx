import React from 'react';
import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import 'highlight.js/styles/vs2015.css';
import * as styles from './index.module.scss';
import visibility from '../../img/visibility.svg';
import save from '../../img/save.svg';
import pdf from '../../img/pdf.svg';
import download from '../../img/download_bk.svg';
import { TemplateEditorCtlProp } from '../../types';
import { fmtTemplate } from '../../utils/';

hljs.registerLanguage('javascript', javascript);

const EditorCtl = ({
  processing,
  template,
  schemas,
  changeBasePdf,
  saveTemplate,
  previewPdf,
  downloadBasePdf,
  loadJsonTemplate,
}: TemplateEditorCtlProp) => {
  return (
    <>
      <div className={`${styles.wrapper}`}>
        <div className={`${styles.desktopFlex}`}>
          <div style={{ display: 'flex', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className={`button is-small ${processing ? 'is-loading' : ''}`}
              disabled={processing}
              onClick={previewPdf}
            >
              <img src={visibility} alt={'Preview'} />
              Preview
            </button>
            <button
              className={`button is-small ${processing ? 'is-loading' : ''}`}
              disabled={processing}
              onClick={() => downloadBasePdf('basePdf')}
            >
              <img src={pdf} alt={'Download Base PDF'} />
              Download Base PDF
            </button>
            <button
              className={`button is-small ${processing ? 'is-loading' : ''}`}
              disabled={processing}
            >
              <img src={pdf} alt={'Change Base PDF'} />
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
                  e.currentTarget.value = '';
                }}
              />
            </button>
            <button
              className={`button is-small is-light is-success ${processing ? 'is-loading' : ''}`}
              disabled={processing}
            >
              <img src={download} alt={'Load Json Template'} />
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
              />
            </button>
            <button
              className={`button is-light is-small is-info ${processing ? 'is-loading' : ''}`}
              disabled={processing}
              onClick={() => saveTemplate(fmtTemplate(template, schemas))}
            >
              <img src={save} alt={'Get Template as Json'} />
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorCtl;
