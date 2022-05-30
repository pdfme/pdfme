import React from 'react';
import { FileDownloadOutlined } from '@mui/icons-material';

type Props = {
  pdfCreationTime: number;
  loadSampleData: () => void;
  downloadPdf: () => void;
};

const DemoAppFormHeader = (props: Props) => {
  const { pdfCreationTime, loadSampleData, downloadPdf } = props;
  return (
    <div className="container">
      <div className={'col col--12'}>
        <h2 className="padding-top--lg">
          <a aria-hidden="true" className="anchor enhancedAnchor" id="form"></a>
          Fill the Form
          <a className="hash-link" href="#form"></a>
        </h2>
        <div className="alert alert--primary" role="alert">
          <p className="margin-bottom--none">
            Input to each cell of the data grid is mirrored in the preview. The data grid can be
            manipulated in the same way as Excel or a spreadsheet.
          </p>
        </div>
        <p className="margin-top--md margin-bottom--none" style={{ textAlign: 'right' }}>
          (Generated in: {pdfCreationTime === 0 ? '-' : Math.round(pdfCreationTime)}ms)
        </p>
        <div className={'text--center'} style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={loadSampleData} className="button button--info">
            Sample Data
          </button>
          <span className="margin-horiz--md">/</span>
          <button onClick={downloadPdf} className="button button--success">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FileDownloadOutlined fontSize="small" style={{ marginRight: '0.25rem' }} />
              <span>Download</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoAppFormHeader;
