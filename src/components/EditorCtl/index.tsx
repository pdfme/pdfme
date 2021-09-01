import * as styles from './index.module.scss';
import labelmake from 'labelmake';
import { i18n } from '../../i18n';
import { isIos, fmtTemplate, sortSchemas, readFile, fmtTemplateFromJson } from '../../utils';
import { lang } from '../../constants';
import visibility from '../../img/visibility.svg';
import save from '../../img/save.svg';
import pdf from '../../img/pdf.svg';
import download from '../../img/download_bk.svg';
import { TemplateEditorCtlProp } from '../../type';

const EditorCtl = ({
  processing,
  template,
  saveTemplate,
  updateTemplate,
}: TemplateEditorCtlProp) => {
  const previewPdf = () => {
    if (isIos()) {
      alert(i18n(lang, 'previewWarnMsg'));
      return;
    }
    const schemas = sortSchemas(template, template.schemas.length);
    labelmake({
      inputs: [
        schemas.reduce((acc, cur) => {
          cur.forEach((c) => {
            acc[c.key] = c.data;
          });
          return acc;
        }, {} as { [key: string]: string }),
      ],
      template: fmtTemplate(template, schemas),
    })
      .then((pdf) => {
        const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
        window.open(URL.createObjectURL(blob));
      })
      .catch(() => {
        alert(i18n(lang, 'previewErrMsg'));
      });
  };

  const changeBasePdf = (file: File) => {
    readFile(file, 'dataURL').then(async (basePdf) => {
      template.basePdf = basePdf;
      updateTemplate(template);
    });
  };

  const loadJsonTemplate = (file: File) => {
    fmtTemplateFromJson(file)
      .then((template) => {
        updateTemplate(template);
      })
      .catch(alert);
  };

  return (
    <>
      <div className={`${styles.wrapper}`}>
        <div className={`${styles.desktopFlex}`}>
          <div style={{ display: 'flex', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
            <button disabled={processing} onClick={previewPdf}>
              <img src={visibility} alt={'Preview'} />
              Preview
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
            <button disabled={processing} onClick={() => saveTemplate(template)}>
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
