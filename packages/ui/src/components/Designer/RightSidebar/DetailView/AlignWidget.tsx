import { Space, Button, Form } from 'antd';
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
} from 'lucide-react';
import { round } from '../../../../helper.js';

const AlignWidget = (props: PropPanelWidgetProps) => {
  const { activeElements, changeSchemas, schemas, pageSize, schema } = props;
  const align = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id));

    const isVertical = ['left', 'center', 'right'].includes(type);
    const tgtPos = isVertical ? 'x' : 'y';
    const tgtSize = isVertical ? 'width' : 'height';
    const isSingle = ass.length === 1;
    // Access pageSize property safely with proper type assertion
    const root =
      pageSize && typeof pageSize === 'object'
        ? tgtSize === 'width'
          ? (pageSize as unknown as { width: number }).width
          : (pageSize as unknown as { height: number }).height
        : 0;

    // Access position properties safely with proper type assertion
    const min = isSingle
      ? 0
      : Math.min(
          ...ass.map((as) => {
            // Safely access position property with proper type assertion
            const position =
              as.position && typeof as.position === 'object'
                ? (as.position as unknown as { x: number; y: number })
                : { x: 0, y: 0 };
            return tgtPos === 'x' ? position.x : position.y;
          }),
        );
    const max = isSingle
      ? root
      : Math.max(
          ...ass.map((as) => {
            // Safely access position and size properties with proper type assertion
            const position =
              as.position && typeof as.position === 'object'
                ? (as.position as unknown as { x: number; y: number })
                : { x: 0, y: 0 };
            const posValue = tgtPos === 'x' ? position.x : position.y;

            // Safely access width/height with proper type assertion
            const asWithSize = as as unknown as { width?: number; height?: number };
            const sizeValue = tgtSize === 'width' ? asWithSize.width || 0 : asWithSize.height || 0;

            return posValue + sizeValue;
          }),
        );

    let basePos = min;
    // Define adjust function with consistent parameter usage
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let adjust = (_size: number): number => 0;

    if (['center', 'middle'].includes(type)) {
      basePos = (min + max) / 2;
      adjust = (size: number): number => size / 2;
    } else if (['right', 'bottom'].includes(type)) {
      basePos = max;
      adjust = (size: number): number => size;
    }

    changeSchemas(
      ass.map((as) => {
        // Safely access size property with proper type assertion
        const asWithSize = as as unknown as { width?: number; height?: number; id: string };
        const sizeValue = tgtSize === 'width' ? asWithSize.width || 0 : asWithSize.height || 0;

        return {
          key: `position.${tgtPos}`,
          value: round(basePos - adjust(sizeValue), 2),
          schemaId: asWithSize.id,
        };
      }),
    );
  };

  const distribute = (type: 'vertical' | 'horizontal') => {
    const ids = activeElements.map((ae) => ae.id);
    const ass = schemas.filter((s) => ids.includes(s.id));

    const isVertical = type === 'vertical';
    const tgtPos = isVertical ? 'y' : 'x';
    const tgtSize = isVertical ? 'height' : 'width';

    // Safely access position property with proper type assertion
    const min = Math.min(
      ...ass.map((as) => {
        const position =
          as.position && typeof as.position === 'object'
            ? (as.position as unknown as { x: number; y: number })
            : { x: 0, y: 0 };
        return tgtPos === 'x' ? position.x : position.y;
      }),
    );

    // Safely access position and size properties with proper type assertion
    const max = Math.max(
      ...ass.map((as) => {
        const position =
          as.position && typeof as.position === 'object'
            ? (as.position as unknown as { x: number; y: number })
            : { x: 0, y: 0 };
        const posValue = tgtPos === 'x' ? position.x : position.y;

        // Safely access width/height with proper type assertion
        const asWithSize = as as unknown as { width?: number; height?: number };
        const sizeValue = tgtSize === 'width' ? asWithSize.width || 0 : asWithSize.height || 0;

        return posValue + sizeValue;
      }),
    );

    if (ass.length < 3) return;

    const boxPos = min;
    const boxSize = max - min;
    // Safely access size property with proper type assertion
    const sum = ass.reduce((acc, cur) => {
      const curWithSize = cur as unknown as { width?: number; height?: number };
      const sizeValue = tgtSize === 'width' ? curWithSize.width || 0 : curWithSize.height || 0;
      return acc + sizeValue;
    }, 0);
    const remain = boxSize - sum;
    const unit = remain / (ass.length - 1);

    let prev = 0;
    changeSchemas(
      ass.map((as, index) => {
        // Safely access size property of previous element with proper type assertion
        const prevSize =
          index === 0
            ? 0
            : (() => {
                const prevAs = ass[index - 1] as unknown as { width?: number; height?: number };
                return tgtSize === 'width' ? prevAs.width || 0 : prevAs.height || 0;
              })();

        prev += index === 0 ? 0 : prevSize + unit;
        const value = round(boxPos + prev, 2);

        // Safely access id with proper type assertion
        const asWithId = as as unknown as { id: string };
        return { key: `position.${tgtPos}`, value, schemaId: asWithId.id };
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
    <Form.Item label={schema.title}>
      <Space.Compact>
        {layoutBtns.map((btn) => (
          <Button
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
