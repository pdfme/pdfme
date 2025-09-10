import React, { useContext, useMemo } from 'react';
import { Plugin, Schema } from '@pdfme/common';
import { OptionsContext } from '../../contexts.js';
import { theme } from 'antd';

interface PluginIconProps {
  plugin: Plugin<Schema>;
  label: string;
  size?: number;
  styles?: React.CSSProperties;
}

const SVGIcon = ({ svgString, size, styles, label }: { 
  svgString: string; 
  size?: number; 
  styles?: React.CSSProperties; 
  label: string;
}) => {
  const processedSVG = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    
    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      return null;
    }

    if (size) {
      svgElement.setAttribute('width', size.toString());
      svgElement.setAttribute('height', size.toString());
    }

    // Sanitize SVG by removing script tags and event handlers
    const scripts = svgElement.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    const allElements = svgElement.querySelectorAll('*');
    allElements.forEach(element => {
      Array.from(element.attributes).forEach(attr => {
        const attrValue = attr.value.trim().toLowerCase();
        if (
          attr.name.startsWith('on') ||
          (
            attr.name === 'href' && (
              attrValue.startsWith('javascript:') ||
              attrValue.startsWith('data:') ||
              attrValue.startsWith('vbscript:')
            )
          )
        ) {
          element.removeAttribute(attr.name);
        }
      });
    });

    return svgElement.outerHTML;
  }, [svgString, size]);

  if (!processedSVG) {
    return null;
  }

  return (
    <div 
      style={styles} 
      title={label}
      dangerouslySetInnerHTML={{ __html: processedSVG }}
    />
  );
};

const PluginIcon = (props: PluginIconProps) => {
  const { plugin, label, size, styles } = props;
  const { token } = theme.useToken();
  const options = useContext(OptionsContext);

  const schemaType = plugin.propPanel.defaultSchema?.type ?? '';

  const icon = options.icons?.[schemaType] ?? plugin.icon;
  const iconStyles = {
    ...styles,
    color: token.colorText,
    display: 'flex',
    justifyContent: 'center',
  };

  if (icon) {
    return <SVGIcon svgString={icon} size={size} styles={iconStyles} label={label} />;
  }

  return (
    <div style={{ ...styles, overflow: 'hidden', fontSize: 10 }} title={label}>
      {label}
    </div>
  );
};

export default PluginIcon;
