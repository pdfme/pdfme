import React, { useContext } from 'react';
import { I18nContext } from '../libs/contexts';
import { PageSize } from '../libs/type';

const Error = ({ size, error }: { size: PageSize; error: Error }) => {
  const i18n = useContext(I18nContext);

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgb(74, 74, 74)',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...size,
      }}
    >
      <p style={{ color: '#fff', textAlign: 'center' }}>
        <span style={{ fontSize: 'large', fontWeight: 'bold', borderBottom: '1px solid #fff' }}>
          ERROR: {i18n('errorOccurred')}
        </span>
        <br />
        <span style={{ fontSize: 'small' }}>*{error.message}</span>
      </p>
    </div>
  );
};

export default Error;
