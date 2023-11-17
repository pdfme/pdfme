import React, { useContext } from 'react';
import { Size } from '@pdfme/common';
import { I18nContext, StyleContext } from '../contexts';
import { Result } from 'antd';

const ErrorScreen = ({ size, error }: { size: Size; error: Error }) => {
  const i18n = useContext(I18nContext);
  const style = useContext(StyleContext);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: style.ErrorScreen.background,
        ...size,
      }}
    >
      <div style={{ width: 300, margin: '0 auto', background: style.ErrorScreen.cardBackground }}>
        <Result
          icon={null}
          title="ERROR"
          subTitle={i18n('errorOccurred')}
          extra={<span>{error.message}</span>}
        />
      </div>
    </div>
  );
};

export default ErrorScreen;
