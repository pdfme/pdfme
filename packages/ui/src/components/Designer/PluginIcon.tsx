import React, { useContext } from 'react';
import { Plugin } from "@pdfme/common";
import { OptionsContext } from '../../contexts';
import { theme } from 'antd';


interface PluginIconProps {
  plugin: Plugin<any>;
  label: string;
  size?: number;
  styles?: React.CSSProperties;
}

const getWithModifiedSize = (htmlString: string, label: string, size: number, styles?: React.CSSProperties) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const modifyNode = (node: HTMLElement) => {
    if (node.tagName === 'SVG' || node.tagName === 'svg') {
      node.setAttribute('width', size.toString());
      node.setAttribute('height', size.toString());
    }
    Array.from(node.children).forEach(child => modifyNode(child as HTMLElement));
  };

  Array.from(doc.body.children).forEach(child => modifyNode(child as HTMLElement));

  return (
    <div style={styles} title={label} dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }} />
  );
};

const PluginIcon = (props: PluginIconProps) => {
  const { plugin, label, size, styles } = props;
  const { token } = theme.useToken();
  const options = useContext(OptionsContext);
  const icon = options.icons?.[plugin.propPanel.defaultSchema.type] ?? plugin.icon;
  const iconStyles = { ...styles, color: token.colorText, display: 'flex', justifyContent: 'center' };

  if (icon) {
    if (size) {
      return getWithModifiedSize(icon, label, size, iconStyles);
    }
    return <div style={iconStyles} title={label} dangerouslySetInnerHTML={{ __html: icon }} />
  }

  return <div style={{ ...styles, overflow: 'hidden', fontSize: 10, }} title={label} >{label}</div>
};

export default PluginIcon;
