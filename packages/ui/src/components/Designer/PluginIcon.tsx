import React, { useContext, useMemo } from 'react';
import { Plugin, Schema } from '@pdfme/common';
import { OptionsContext } from '../../contexts.js';
import { theme } from 'antd';
import DOMPurify from 'dompurify';

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
    // First sanitize the SVG string using DOMPurify with SVG profile
    const sanitizedSVG = DOMPurify.sanitize(svgString, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ALLOWED_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'g', 'defs', 'title', 'desc', 'metadata'],
      ALLOWED_ATTR: ['class', 'id', 'fill', 'stroke', 'stroke-width', 'viewBox', 'width', 'height', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'rx', 'ry', 'transform'],
      FORBID_TAGS: ['script', 'foreignObject', 'use', 'embed', 'iframe', 'object', 'link', 'style'],
      FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'href', 'xlink:href', 'src', 'action', 'formaction'],
      KEEP_CONTENT: false
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedSVG, 'image/svg+xml');
    
    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      return null;
    }

    // Apply size attributes if specified
    if (size) {
      svgElement.setAttribute('width', size.toString());
      svgElement.setAttribute('height', size.toString());
    }

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
