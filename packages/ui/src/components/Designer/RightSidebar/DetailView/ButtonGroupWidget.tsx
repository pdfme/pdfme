import { Button, Form } from 'antd';
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

  const apply = (btn: ButtonConfig) => {
    const key = btn.key;
    const type = btn.type;
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id)) as SchemaForUI[];
    changeSchemas(
      ass.map((s: Record<string, any>) => {
        const oldValue = s[key] ?? false;
        const newValue = type === 'boolean' ? !oldValue : btn.value;
        return { key, value: newValue, schemaId: s.id };
      })
    );
  };

  const isActive = (btn: ButtonConfig) => {
    const key = btn.key;
    const type = btn.type;
    let active = false;
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id)) as SchemaForUI[];
    ass.forEach((s: Record<string, any>) => {
      active = type === 'boolean' ? s[key] ?? false : s[key] === btn.value;
    });
    return active;
  };

  const svgIcon = (svgString: string) => {
    const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    return <img width={17} height={17} src={svgDataUrl} />;
  };

  return (
    <Form.Item>
      <Button.Group>
        {schema.buttons.map((btn: ButtonConfig, index: number) => {
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
      </Button.Group>
    </Form.Item>
  );
};

export default ButtonGroupWidget;
