import { Button, Form } from 'antd';
import React from 'react';
import type { PropPanelWidgetProps } from '@pdfme/common';
import {
  AlignStartVertical,
  AlignStartHorizontal,
  AlignCenterVertical,
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignEndHorizontal,
  AlignVerticalSpaceAround,
  AlignHorizontalSpaceAround,
} from 'lucide-react'
import { round } from '../../../../helper';

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
  const layoutBtns: {
    id: string;
    icon: React.JSX.Element;
    onClick: () => void;
  }[] = [
      {
        id: 'left',
        icon: <AlignStartVertical size={15} />,
        onClick: () => align('left')
      },
      {
        id: 'center',
        icon: <AlignCenterVertical size={15} />,
        onClick: () => align('center')
      },
      {
        id: 'right',
        icon: <AlignEndVertical size={15} />,
        onClick: () => align('right')
      },
      {
        id: 'top',
        icon: <AlignStartHorizontal size={15} />,
        onClick: () => align('top')
      },
      {
        id: 'middle',
        icon: <AlignCenterHorizontal size={15} />,
        onClick: () => align('middle')
      },
      {
        id: 'bottom',
        icon: <AlignEndHorizontal size={15} />,
        onClick: () => align('bottom')
      },
      {
        id: 'vertical',
        icon: <AlignVerticalSpaceAround size={15} />,
        onClick: () => distribute('vertical')
      },
      {
        id: 'horizontal',
        icon: <AlignHorizontalSpaceAround size={15} />,
        onClick: () => distribute('horizontal')
      },
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
