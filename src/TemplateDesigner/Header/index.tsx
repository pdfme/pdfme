import { useContext } from 'react';
import * as styles from './index.module.scss';
import labelmake from 'labelmake';
import { isIos, fmtTemplate, sortSchemas, readFile, fmtTemplateFromJson } from '../../libs/utils';
import visibility from '../../assets/visibility.svg';
import save from '../../assets/save.svg';
import pdf from '../../assets/pdf.svg';
import download from '../../assets/download_bk.svg';
import { TemplateDesignerHeaderProp } from '../../libs/type';
import { I18nContext } from '../../libs/i18n';

const Header = ({ processing, template, saveTemplate, updateTemplate }: TemplateDesignerHeaderProp) => {
  const i18n = useContext(I18nContext);
  const previewPdf = () => {
    if (isIos()) {
      alert(i18n('previewWarnMsg'));
      return;
    }
    const schemas = sortSchemas(template, template.schemas.length);
    const fmtdTemplate = fmtTemplate(template, schemas);
    labelmake({
      inputs: fmtdTemplate.sampledata,
      template: fmtdTemplate,
    })
      .then((pdf) => {
        const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
        window.open(URL.createObjectURL(blob));
      })
      .catch(() => {
        alert(i18n('previewErrMsg'));
      });
  };

  const changeBasePdf = (file: File) => {
    readFile(file, 'dataURL').then(async (basePdf) => {
      template.basePdf = basePdf;
      updateTemplate(template);
    });
  };

  const loadJsonTemplate = (file: File) => {
    fmtTemplateFromJson(file).then(updateTemplate).catch(alert);
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

export default Header;
