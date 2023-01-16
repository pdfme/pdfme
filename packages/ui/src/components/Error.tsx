import React, { useContext } from 'react';
import { Size } from '@pdfme/common';
import { I18nContext } from '../contexts';

const Error = ({ size, error }: { size: Size; error: Error }) => {
  const i18n = useContext(I18nContext);

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgb(74, 74, 74)',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...size,
      }}
    >
      <span style={{ color: '#fff', textAlign: 'center' }}>
        <span style={{ fontSize: 'large', fontWeight: 'bold', borderBottom: '1px solid #fff' }}>
          ERROR: {i18n('errorOccurred')}
        </span>
        <br />
        <span style={{ fontSize: 'small' }}>*{error.message}</span>
      </span>
    </div>
  );
};

export default Error;
