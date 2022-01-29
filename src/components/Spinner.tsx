import React from 'react';

const Spinner = () => (
  <>
    <style>
      {`
      @keyframes spin {
        0% { transform: rotate(0deg) }
        
        100% { transform: rotate(359deg) }
      }
    `}
    </style>
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 65,
          height: 65,
          borderRadius: '50%',
          border: '4px solid',
          borderColor: '#4285f4 rgba(0,0,0,0.1) rgba(0,0,0,0.1)',
          animation: 'spin 1s ease infinite',
        }}
      ></div>
    </div>
  </>
);

export default Spinner;
