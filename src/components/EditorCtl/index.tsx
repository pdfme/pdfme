import * as styles from './index.module.scss';
import visibility from '../../img/visibility.svg';
import save from '../../img/save.svg';
import pdf from '../../img/pdf.svg';
import download from '../../img/download_bk.svg';
import { TemplateEditorCtlProp } from '../../type';
import { fmtTemplate } from '../../utils/';

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
            <button disabled={processing} onClick={previewPdf}>
              <img src={visibility} alt={'Preview'} />
              Preview
            </button>
            <button disabled={processing} onClick={() => downloadBasePdf('basePdf')}>
              <img src={pdf} alt={'Download Base PDF'} />
              Download Base PDF
            </button>
            <button disabled={processing}>
              <img src={pdf} alt={'Change Base PDF'} />
              Change Base PDF
              <input
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
            <button disabled={processing}>
              <img src={download} alt={'Load Json Template'} />
              Load
              <input
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
