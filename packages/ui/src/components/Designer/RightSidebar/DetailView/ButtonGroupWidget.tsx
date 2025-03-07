import { Space, Button, Form, theme } from 'antd';
import React from 'react';
import type { PropPanelWidgetProps, SchemaForUI } from '@pdfme/common';
interface ButtonConfig {
  key: string;
  icon: string;
  type: 'boolean' | 'select';
  value?: string;
}

const ButtonGroupWidget = (props: PropPanelWidgetProps) => {
  const { activeElements, changeSchemas, schemas, schema } = props;
  const { token } = theme.useToken();

  const apply = (btn: ButtonConfig) => {
    const key = btn.key;
    const type = btn.type;
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id));
    changeSchemas(
      ass.map((s: SchemaForUI) => {
        const oldValue = Boolean((s as Record<string, unknown>)[key] ?? false);
        const newValue = type === 'boolean' ? !oldValue : btn.value;
        return { key, value: newValue, schemaId: s.id };
      }),
    );
  };

  const isActive = (btn: ButtonConfig) => {
    const key = btn.key;
    const type = btn.type;
    let active = false;
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id));
    ass.forEach((s: SchemaForUI) => {
      // Cast schema to Record to safely access dynamic properties
      const schemaRecord = s as Record<string, unknown>;
      active =
        type === 'boolean' ? Boolean(schemaRecord[key] ?? false) : schemaRecord[key] === btn.value;
    });
    return active;
  };

  const replaceCurrentColor = (svgString: string, color?: string) =>
    color ? svgString.replace(/="currentColor"/g, `="${color}"`) : svgString;

  const svgIcon = (svgString: string) => {
    const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
      replaceCurrentColor(svgString, token.colorText),
    )}`;
    return <img width={17} height={17} src={svgDataUrl} alt="" />;
  };

  return (
    <Form.Item>
      <Space.Compact>
        {(schema.buttons as ButtonConfig[]).map((btn: ButtonConfig, index: number) => {
          const active = isActive(btn);
          return (
            <Button
              type={active ? 'primary' : undefined}
              ghost={active}
              onClick={() => apply(btn)}
              style={{
                padding: 7,
                zIndex: active ? 2 : 0,
              }}
              key={index}
              icon={svgIcon(btn.icon)}
            />
          );
        })}
      </Space.Compact>
    </Form.Item>
  );
};

export default ButtonGroupWidget;
