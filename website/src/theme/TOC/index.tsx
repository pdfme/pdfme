import React from 'react';
import TOC from '@theme-original/TOC';
import type TOCType from '@theme/TOC';
import type { WrapperProps } from '@docusaurus/types';
import { Zap, LifeBuoy } from 'lucide-react';
type BannerProps = {
  title: string;
  subtitle: string;
  href: string;
  gradient: string; // 'linear-gradient(45deg, ... )'
  Icon: any;
};

function Banner({ title, subtitle, href, gradient, Icon }: BannerProps) {
  const bannerStyle: React.CSSProperties = {
    background: gradient,
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(37, 194, 160, 0.3)',
    padding: '16px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  };

  const blurCircleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.3)',
    filter: 'blur(20px)',
    zIndex: 0,
  };

  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
  };

  const linkStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: 'white',
    textDecoration: 'none',
  };

  const titleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '8px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const iconStyle: React.CSSProperties = {
    marginRight: '8px',
    fontSize: '24px',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
  };

  const subtitleStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '12px',
    textAlign: 'center',
    lineHeight: '1.4',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  };

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
      <div
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
            <Icon style={iconStyle} />
            <span>{title}</span>
          </div>
          <p style={subtitleStyle}>{subtitle}</p>
        </div>
      </div>
    </a>
  );
}

export function SidebarBannerCloud() {
  return (
    <Banner
      title="Try pdfme Cloud"
      subtitle="No setup needed. Create PDFs in seconds with pdfme Cloud!"
      href="https://app.pdfme.com?utm_source=website&utm_content=banner-cloud"
      gradient="linear-gradient(45deg, rgb(37, 194, 160), rgb(32, 166, 137))"
      Icon={Zap}
    />
  );
}

export function SidebarBannerSupport() {
  return (
    <Banner
      title="Technical Support & Consulting"
      subtitle="Need advanced solutions or professional guidance? Our pdfme experts are here to help."
      href="https://app.pdfme.com/contact?utm_source=website&utm_content=banner-support"
      gradient="linear-gradient(45deg, rgb(113, 37, 194), rgb(32, 70, 166))"
      Icon={LifeBuoy}
    />
  );
}


type Props = WrapperProps<typeof TOCType>;

export default function TOCWrapper(props: Props): JSX.Element {
  return (
    <div style={{ position: 'sticky', top: 76 }}>
      <TOC {...props} />
      <div>
        <div style={{ height: 16 }} />
        <SidebarBannerCloud />
        <div style={{ height: 16 }} />
        <SidebarBannerSupport />
      </div>
    </div>
  );
}
