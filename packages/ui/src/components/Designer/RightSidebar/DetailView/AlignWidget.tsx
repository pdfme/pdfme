import { Button, Form } from 'antd';
import React from 'react';
import type { PropPanelWidgetProps } from '@pdfme/common';
import { round } from '../../../../helper';

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

const createButtonConfig = (id: string, path: JSX.Element, onClick: () => void) => ({
  id,
  icon: createSvgIcon(path),
  onClick,
});

const AlignWidget = (props: PropPanelWidgetProps) => {
  const { activeElements, changeSchemas, schemas, pageSize, schema } = props;
  const align = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id));

    const isVertical = ['left', 'center', 'right'].includes(type);
    const tgtPos = isVertical ? 'x' : 'y';
    const tgtSize = isVertical ? 'width' : 'height';
    const isSingle = ass.length === 1;
    const root = pageSize[tgtSize];

    const min = isSingle ? 0 : Math.min(...ass.map((as) => as.position[tgtPos]));
    const max = isSingle ? root : Math.max(...ass.map((as) => as.position[tgtPos] + as[tgtSize]));

    let basePos = min;
    let adjust = (_: number) => 0;

    if (['center', 'middle'].includes(type)) {
      basePos = (min + max) / 2;
      adjust = (num: number) => num / 2;
    } else if (['right', 'bottom'].includes(type)) {
      basePos = max;
      adjust = (num: number) => num;
    }

    changeSchemas(
      ass.map((as) => ({
        key: `position.${tgtPos}`,
        value: round(basePos - adjust(as[tgtSize]), 2),
        schemaId: as.id,
      }))
    );
  };

  const distribute = (type: 'vertical' | 'horizontal') => {
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id));

    const isVertical = type === 'vertical';
    const tgtPos = isVertical ? 'y' : 'x';
    const tgtSize = isVertical ? 'height' : 'width';
    const min = Math.min(...ass.map((as) => as.position[tgtPos]));
    const max = Math.max(...ass.map((as) => as.position[tgtPos] + as[tgtSize]));

    if (ass.length < 3) return;

    const boxPos = min;
    const boxSize = max - min;
    const sum = ass.reduce((acc, cur) => acc + cur[tgtSize], 0);
    const remain = boxSize - sum;
    const unit = remain / (ass.length - 1);

    let prev = 0;
    changeSchemas(
      ass.map((as, index) => {
        prev += index === 0 ? 0 : ass[index - 1][tgtSize] + unit;
        const value = round(boxPos + prev, 2);
        return { key: `position.${tgtPos}`, value, schemaId: as.id };
      })
    );
  };
  const layoutBtns = [
    createButtonConfig('left', <path d="M4,22H2V2h2V22z M22,7H6v3h16V7z M16,14H6v3h10V14z" />, () =>
      align('left')
    ),
    createButtonConfig(
      'center',
      <polygon points="11,2 13,2 13,7 21,7 21,10 13,10 13,14 18,14 18,17 13,17 13,22 11,22 11,17 6,17 6,14 11,14 11,10 3,10 3,7 11,7" />,
      () => align('center')
    ),
    createButtonConfig(
      'right',
      <path d="M20,2h2v20h-2V2z M2,10h16V7H2V10z M8,17h10v-3H8V17z" />,
      () => align('right')
    ),
    createButtonConfig('top', <path d="M22,2v2H2V2H22z M7,22h3V6H7V22z M14,16h3V6h-3V16z" />, () =>
      align('top')
    ),
    createButtonConfig(
      'middle',
      <polygon points="22,11 17,11 17,6 14,6 14,11 10,11 10,3 7,3 7,11 1.84,11 1.84,13 7,13 7,21 10,21 10,13 14,13 14,18 17,18 17,13 22,13" />,
      () => align('middle')
    ),
    createButtonConfig(
      'bottom',
      <path d="M22,22H2v-2h20V22z M10,2H7v16h3V2z M17,8h-3v10h3V8z" />,
      () => align('bottom')
    ),
    createButtonConfig(
      'vertical',
      <path d="M22,2v2H2V2H22z M7,10.5v3h10v-3H7z M2,20v2h20v-2H2z" />,
      () => distribute('vertical')
    ),
    createButtonConfig(
      'horizontal',
      <path d="M4,22H2V2h2V22z M22,2h-2v20h2V2z M13.5,7h-3v10h3V7z" />,
      () => distribute('horizontal')
    ),
  ];

  return (
    <Form.Item label={schema.title}>
      <Button.Group>
        {layoutBtns.map((btn) => (
          <Button
            key={btn.id}
            style={{ padding: 7 }}
            disabled={activeElements.length <= 2 && ['vertical', 'horizontal'].includes(btn.id)}
            {...btn}
          />
        ))}
      </Button.Group>
    </Form.Item>
  );
};

export default AlignWidget;
