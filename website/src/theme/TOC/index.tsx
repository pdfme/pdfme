import React from 'react';
import TOC from '@theme-original/TOC';
import type TOCType from '@theme/TOC';
import type { WrapperProps } from '@docusaurus/types';
import { FlashOn } from '@mui/icons-material';

function SidebarBanner() {
  const bannerStyle = {
    background: 'linear-gradient(45deg, rgb(37, 194, 160), rgb(32, 166, 137))',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(37, 194, 160, 0.3)',
    padding: '16px',
    position: 'relative' as const,
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  const blurCircleStyle = {
    position: 'absolute' as const,
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.3)',
    filter: 'blur(20px)',
    zIndex: 0,
  };

  const contentStyle = {
    position: 'relative' as const,
    zIndex: 1,
  };

  const linkStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    color: 'white',
    textDecoration: 'none',
  };

  const titleStyle = {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '8px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const iconStyle = {
    marginRight: '8px',
    fontSize: '24px',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
  };

  const subtitleStyle = {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '12px',
    textAlign: 'center' as const,
    lineHeight: '1.4',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  };

  return (
    <a
      href="https://app.pdfme.com"
      target="_blank"
      rel="noopener noreferrer"
      style={linkStyle}
    >
      <div
        className="sidebar-banner"
        style={bannerStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 194, 160, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 194, 160, 0.3)';
        }}
      >
        <div style={{ ...blurCircleStyle, top: '-50px', left: '-50px' }} />
        <div style={{ ...blurCircleStyle, bottom: '-30px', right: '-30px' }} />
        <div style={contentStyle}>
          <div style={titleStyle}>
            <FlashOn style={iconStyle} />
            <span>Try pdfme Cloud</span>
          </div>
          <p style={subtitleStyle}>
            No setup needed. Create PDFs in seconds with pdfme Cloud!
          </p>
        </div>
      </div>
    </a>
  );
}

type Props = WrapperProps<typeof TOCType>;

export default function TOCWrapper(props: Props): JSX.Element {
  return (
    <div style={{ position: 'sticky', top: 76 }}>
      <TOC {...props} />
      <div style={{ height: 32 }} />
      <SidebarBanner />
    </div>
  );
}
