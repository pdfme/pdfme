import { Space, Button, Form, theme } from 'antd';
import React, { useContext } from 'react';
import type { PropPanelWidgetProps, SchemaForUI } from '@pdfme/common';
import { I18nContext } from '../../../../contexts.js';
import { getSameTypeBulkUpdateSchemas } from './schemaChangeHelpers.js';
interface ButtonConfig {
  key: string;
  icon: string;
  type: 'boolean' | 'select' | 'cycle';
  value?: string;
  values?: string[];
  labels?: string[];
}

type ButtonGroupWidgetProps = Pick<
  PropPanelWidgetProps,
  'activeElements' | 'activeSchema' | 'changeSchemas' | 'schemas' | 'schema'
>;

const ButtonGroupWidget = (props: ButtonGroupWidgetProps) => {
  const { activeElements, activeSchema, changeSchemas, schemas, schema } = props;
  const { token } = theme.useToken();
  const i18n = useContext(I18nContext);
  const buttons = Array.isArray(schema?.buttons) ? (schema.buttons as ButtonConfig[]) : [];

  const getSelectedSchemas = () => {
    const ids = activeElements.map((ae) => ae.id);
    return schemas.filter((s) => ids.includes(s.id));
  };

  const getTargetSchemas = () =>
    getSameTypeBulkUpdateSchemas({
      activeSchema,
      activeSchemas: getSelectedSchemas(),
    });

  const getButtonValue = (btn: ButtonConfig, targetSchemas: SchemaForUI[]) => {
    if (btn.type === 'select') return btn.value;
    if (btn.type === 'cycle') {
      const values = btn.values ?? [];
      if (values.length === 0) return undefined;
      const defaultValue = values[0];
      const currentValue =
        (targetSchemas[0] as Record<string, unknown> | undefined)?.[btn.key] ?? defaultValue;
      const allSameValue = targetSchemas.every(
        (s) => ((s as Record<string, unknown>)[btn.key] ?? defaultValue) === currentValue,
      );
      if (!allSameValue) return values[0];
      const currentIndex = values.indexOf(String(currentValue));
      return values[(currentIndex + 1 + values.length) % values.length];
    }

    const isActive = targetSchemas.every((s) =>
      Boolean((s as Record<string, unknown>)[btn.key] ?? false),
    );
    return !isActive;
  };

  const apply = (btn: ButtonConfig) => {
    const targetSchemas = getTargetSchemas();
    const value = getButtonValue(btn, targetSchemas);
    changeSchemas(targetSchemas.map((s: SchemaForUI) => ({ key: btn.key, value, schemaId: s.id })));
  };

  const isActive = (btn: ButtonConfig) => {
    const key = btn.key;
    const type = btn.type;
    const targetSchemas = getTargetSchemas();
    if (targetSchemas.length === 0) return false;

    return targetSchemas.every((s: SchemaForUI) => {
      // Cast schema to Record to safely access dynamic properties
      const schemaRecord = s as Record<string, unknown>;
      if (type === 'boolean') return Boolean(schemaRecord[key] ?? false);
      if (type === 'cycle') {
        const defaultValue = btn.values?.[0];
        return defaultValue !== undefined && (schemaRecord[key] ?? defaultValue) !== defaultValue;
      }
      return schemaRecord[key] === btn.value;
    });
  };

  const getButtonLabel = (btn: ButtonConfig) => {
    if (btn.type !== 'cycle') return undefined;
    const targetSchemas = getTargetSchemas();
    const defaultValue = btn.values?.[0];
    const firstValue =
      (targetSchemas[0] as Record<string, unknown> | undefined)?.[btn.key] ?? defaultValue;
    const isConsistent = targetSchemas.every(
      (s) => ((s as Record<string, unknown>)[btn.key] ?? defaultValue) === firstValue,
    );
    const index = isConsistent ? btn.values?.indexOf(String(firstValue)) : 0;
    const label = btn.labels?.[index ?? 0] ?? '';
    return `${i18n('schemas.text.textTransform')}: ${label}`;
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
        {buttons.map((btn: ButtonConfig, index: number) => {
          const active = isActive(btn);
          const label = getButtonLabel(btn);
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
              title={label}
              aria-label={label}
            />
          );
        })}
      </Space.Compact>
    </Form.Item>
  );
};

export default ButtonGroupWidget;
