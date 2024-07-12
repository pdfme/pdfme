import { Button, Form } from 'antd';
import React from 'react';
import type { PropPanelWidgetProps, SchemaForUI } from '@pdfme/common';

type SupportedFormatting = 'underline' | 'strikethrough';

type ExtendedSchemaForUI = SchemaForUI & {
  format: {
    [key in SupportedFormatting]?: boolean;
  };
};

const svgBaseProp = {
  style: { width: '90%', height: '90%' },
  xmlns: 'http://www.w3.org/2000/svg',
  enableBackground: 'new 0 0 24 24',
  height: '24px',
  viewBox: '0 0 24 24',
  width: '24px',
  fill: '#000000',
};

const createSvgIcon = (path: JSX.Element) => (
  <svg {...svgBaseProp}>
    <rect fill="none" height="24" width="24" />
    {path}
  </svg>
);

const createButtonConfig = (id: SupportedFormatting, path: JSX.Element, onClick: () => void) => ({
  id,
  icon: createSvgIcon(path),
  onClick,
});

const TextFormatWidget = (props: PropPanelWidgetProps) => {
  const { activeElements, changeSchemas, schemas } = props;

  const apply = (type: SupportedFormatting) => {
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id)) as ExtendedSchemaForUI[];
    changeSchemas(
      ass.map((s) => {
        const oldValue = s.format ? (s.format[type] ?? false) : false;
        return { key: `format.${type}`, value: !oldValue, schemaId: s.id };
      })
    );
  };

  const isActive = (type: SupportedFormatting) => {
    let active = false
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id)) as ExtendedSchemaForUI[];
    ass.forEach((s) => {
      active = s.format ? (s.format[type] ?? false) : false;
    })
    return active
  }

  const layoutBtns = [
    createButtonConfig(
      'strikethrough',
      <path d="M12.5656 7.73438C11.0656 7.73438 10.0734 8.48438 10.0734 9.625C10.0734 10.2317 10.3649 10.6613 11.0519 11H8.90358C8.71703 10.6199 8.62813 10.1801 8.62813 9.67188C8.62813 7.75781 10.2297 6.46094 12.6125 6.46094C14.7922 6.46094 16.4172 7.75781 16.5344 9.57812H15.1203C14.925 8.42188 13.9719 7.73438 12.5656 7.73438ZM12.4875 18.2656C10.0969 18.2656 8.44844 17 8.3 15.0547H9.72188C9.89375 16.2344 11.0188 16.9844 12.6203 16.9844C14.1359 16.9844 15.2531 16.1641 15.2531 15.0469C15.2531 14.6375 15.1255 14.292 14.8589 14H16.5912C16.6638 14.266 16.6984 14.5566 16.6984 14.875C16.6984 16.9453 15.0656 18.2656 12.4875 18.2656ZM7 13.1H18V11.9H7V13.1Z" />,
      () => apply('strikethrough')
    ),
    createButtonConfig(
      'underline',
      <path d="M8.17 7.11409H9.52791V14.1677C9.52791 15.8123 10.6067 17.0042 12.4927 17.0042C14.3787 17.0042 15.4574 15.8123 15.4574 14.1677V7.11409H16.8154V14.2582C16.8154 16.5817 15.1934 18.2565 12.4927 18.2565C9.79195 18.2565 8.17 16.5817 8.17 14.2582V7.11409ZM7 21.1H18V19.9H7V21.1Z" />,
      () => apply('underline')
    ),
  ];

  return (
    <Form.Item>
      <Button.Group>
        {layoutBtns.map((btn) => {
          const active = isActive(btn.id)
          return (
            <Button 
              type={active ? 'primary' : undefined}
              ghost={active}
              key={btn.id} 
              style={{ 
                padding: 3, 
                zIndex: active ? 2 : 0
              }} 
              {...btn} 
            />
          );
        })}
      </Button.Group>
    </Form.Item>
  );
};

export default TextFormatWidget;
