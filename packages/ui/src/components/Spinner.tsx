import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { theme } from 'antd';

const Spinner: React.FC = () => {
  const { token } = theme.useToken();

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    color: token.colorPrimary,
  };

  const loaderStyle: React.CSSProperties = {
    animation: 'spin 1s linear infinite',
  };

  const keyframes = `
    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div style={containerStyle}>
        <LoaderCircle size={50} style={loaderStyle} />
      </div>
    </>
  );
};

export default Spinner;
