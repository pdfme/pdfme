import React, { CSSProperties } from 'react';
import { SchemaForUI } from '@pdfme/common';
import { round } from '../../../../helper';
import { SidebarProps } from '..';
import alignVerticalTop from '../../../../assets/icons/align-vertical-top.svg';
import alignVerticalMiddle from '../../../../assets/icons/align-vertical-middle.svg';
import alignVerticalBottom from '../../../../assets/icons/align-vertical-bottom.svg';
import alignHorizontalRight from '../../../../assets/icons/align-horizontal-right.svg';
import alignHorizontalLeft from '../../../../assets/icons/align-horizontal-left.svg';
import alignHorizontalCenter from '../../../../assets/icons/align-horizontal-center.svg';
import verticalDistribute from '../../../../assets/icons/vertical-distribute.svg';
import horizontalDistribute from '../../../../assets/icons/horizontal-distribute.svg';

const inputSetStyle: CSSProperties = { marginRight: '1rem', display: 'flex', alignItems: 'center' };

const inputStyle: CSSProperties = {
  width: 70,
  border: '1px solid #767676',
  borderRadius: 2,
  color: '#333',
  background: 'none',
};

const buttonStyle: CSSProperties = {
  display: 'flex',
  background: 'none',
  alignItems: 'center',
  borderRadius: 2,
  border: '1px solid rgb(118, 118, 118)',
  cursor: 'pointer',
};

const PositionAndSizeEditor = (
  props: Pick<SidebarProps, 'pageSize' | 'schemas' | 'changeSchemas' | 'activeElements'> & {
    activeSchema: SchemaForUI;
  }
) => {
  const { changeSchemas, schemas, activeSchema, activeElements, pageSize } = props;

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

  const layoutBtns: { id: string; icon: any; action: () => void }[] = [
    { id: 'left', icon: alignHorizontalLeft, action: () => align('left') },
    { id: 'center', icon: alignHorizontalCenter, action: () => align('center') },
    { id: 'right', icon: alignHorizontalRight, action: () => align('right') },
    { id: 'top', icon: alignVerticalTop, action: () => align('top') },
    { id: 'middle', icon: alignVerticalMiddle, action: () => align('middle') },
    { id: 'bottom', icon: alignVerticalBottom, action: () => align('bottom') },
    { id: 'vertical', icon: verticalDistribute, action: () => distribute('vertical') },
    { id: 'horizontal', icon: horizontalDistribute, action: () => distribute('horizontal') },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        {layoutBtns.map((b) => (
          <button key={b.id} title={b.id} onClick={b.action} style={buttonStyle}>
            <img width={15} src={b.icon} />
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={inputSetStyle}>
          <label style={{ width: 17 }}>X</label>
          <input
            style={inputStyle}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.width + value < pageSize.width) {
                changeSchemas([{ key: 'position.x', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.position.x}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
        <div style={inputSetStyle}>
          <label style={{ width: 17 }}>Y</label>
          <input
            style={inputStyle}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.height + value < pageSize.height) {
                changeSchemas([{ key: 'position.y', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.position.y}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={inputSetStyle}>
          <label style={{ width: 17 }}>W</label>
          <input
            style={inputStyle}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.position.x + value < pageSize.width) {
                changeSchemas([{ key: 'width', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.width}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
        <div style={inputSetStyle}>
          <label style={{ width: 17 }}>H</label>
          <input
            style={inputStyle}
            type="number"
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 0 && activeSchema.position.y + value < pageSize.height) {
                changeSchemas([{ key: 'height', value, schemaId: activeSchema.id }]);
              }
            }}
            value={activeSchema.height}
          />
          <span style={{ fontSize: '0.6rem' }}>mm</span>
        </div>
      </div>
    </div>
  );
};

export default PositionAndSizeEditor;
