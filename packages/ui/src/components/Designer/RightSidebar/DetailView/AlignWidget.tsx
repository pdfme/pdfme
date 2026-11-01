import { Space, Button, Form } from 'antd';
import React from 'react';
import type { PropPanelWidgetProps, SchemaForUI } from '@pdfme/common';
import { getRotatedBoundingBox } from '@pdfme/common';
import { DESIGNER_CLASSNAME } from '../../../../constants.js';
import {
  AlignStartVertical,
  AlignStartHorizontal,
  AlignCenterVertical,
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignEndHorizontal,
  AlignVerticalSpaceAround,
  AlignHorizontalSpaceAround,
} from 'lucide-react';
import { round } from '../../../../helper.js';

// Align and distribute by the visible (rotated) box; `offset` maps its edge back to `position`.
const getExtent = (schema: SchemaForUI, axis: 'x' | 'y') => {
  const box = getRotatedBoundingBox(schema);
  const start = axis === 'x' ? box.x : box.y;
  const size = axis === 'x' ? box.width : box.height;
  return { start, size, end: start + size, offset: schema.position[axis] - start };
};

const AlignWidget = (props: PropPanelWidgetProps) => {
  const { activeElements, changeSchemas, schemas, pageSize, schema } = props;
  const getActiveSchemas = () => {
    const ids = activeElements.map((ae) => ae.id);
    return schemas.filter((s) => ids.includes(s.id));
  };

  const align = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const ass = getActiveSchemas();
    const axis = ['left', 'center', 'right'].includes(type) ? 'x' : 'y';
    const extents = ass.map((as) => getExtent(as, axis));
    const isSingle = ass.length === 1;
    const page = pageSize as { width: number; height: number } | undefined;
    const root = axis === 'x' ? (page?.width ?? 0) : (page?.height ?? 0);

    const min = isSingle ? 0 : Math.min(...extents.map((e) => e.start));
    const max = isSingle ? root : Math.max(...extents.map((e) => e.end));

    let basePos = min;
    let adjust: (size: number) => number = () => 0;

    if (['center', 'middle'].includes(type)) {
      basePos = (min + max) / 2;
      adjust = (size: number): number => size / 2;
    } else if (['right', 'bottom'].includes(type)) {
      basePos = max;
      adjust = (size: number): number => size;
    }

    changeSchemas(
      ass.map((as, i) => ({
        key: `position.${axis}`,
        value: round(basePos - adjust(extents[i].size) + extents[i].offset, 2),
        schemaId: as.id,
      })),
    );
  };

  const distribute = (type: 'vertical' | 'horizontal') => {
    const ass = getActiveSchemas();
    if (ass.length < 3) return;

    const axis = type === 'vertical' ? 'y' : 'x';
    const extents = ass.map((as) => getExtent(as, axis));
    const min = Math.min(...extents.map((e) => e.start));
    const max = Math.max(...extents.map((e) => e.end));
    const sum = extents.reduce((acc, e) => acc + e.size, 0);
    const unit = (max - min - sum) / (ass.length - 1);

    let prev = 0;
    changeSchemas(
      ass.map((as, index) => {
        prev += index === 0 ? 0 : extents[index - 1].size + unit;
        const value = round(min + prev + extents[index].offset, 2);
        return { key: `position.${axis}`, value, schemaId: as.id };
      }),
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
      onClick: () => align('left'),
    },
    {
      id: 'center',
      icon: <AlignCenterVertical size={15} />,
      onClick: () => align('center'),
    },
    {
      id: 'right',
      icon: <AlignEndVertical size={15} />,
      onClick: () => align('right'),
    },
    {
      id: 'top',
      icon: <AlignStartHorizontal size={15} />,
      onClick: () => align('top'),
    },
    {
      id: 'middle',
      icon: <AlignCenterHorizontal size={15} />,
      onClick: () => align('middle'),
    },
    {
      id: 'bottom',
      icon: <AlignEndHorizontal size={15} />,
      onClick: () => align('bottom'),
    },
    {
      id: 'vertical',
      icon: <AlignVerticalSpaceAround size={15} />,
      onClick: () => distribute('vertical'),
    },
    {
      id: 'horizontal',
      icon: <AlignHorizontalSpaceAround size={15} />,
      onClick: () => distribute('horizontal'),
    },
  ];

  return (
    <Form.Item label={schema?.title}>
      <Space.Compact>
        {layoutBtns.map((btn) => (
          <Button
            className={DESIGNER_CLASSNAME + 'align-' + btn.id}
            key={btn.id}
            style={{ padding: 7 }}
            disabled={activeElements.length <= 2 && ['vertical', 'horizontal'].includes(btn.id)}
            {...btn}
          />
        ))}
      </Space.Compact>
    </Form.Item>
  );
};

export default AlignWidget;
