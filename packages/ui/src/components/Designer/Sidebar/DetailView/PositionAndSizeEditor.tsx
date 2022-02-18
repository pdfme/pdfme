import React, { CSSProperties } from 'react';
import { SchemaForUI } from '@pdfme/common';
import { round } from '../../../../helper';
import { SidebarProps } from '..';
import alignVerticalTop from '../../../../assets/icons/align-vertical-top.svg';
import alignVerticalCenter from '../../../../assets/icons/align-vertical-center.svg';
import alignVerticalBottom from '../../../../assets/icons/align-vertical-bottom.svg';
import alignHorizontalRight from '../../../../assets/icons/align-horizontal-right.svg';
import alignHorizontalLeft from '../../../../assets/icons/align-horizontal-left.svg';
import alignHorizontalCenter from '../../../../assets/icons/align-horizontal-center.svg';

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
    const aid = activeElements.map((e) => e.id);
    const ass = schemas.filter((s) => aid.includes(s.id));

    const isVertical = ['left', 'center', 'right'].includes(type);
    const isHorizontal = ['top', 'middle', 'bottom'].includes(type);
    const tgtPos = isVertical ? 'x' : 'y';
    const tgtSize = isVertical ? 'width' : 'height';
    const isSingle = ass.length === 1;
    const root = pageSize[tgtSize];

    const min = isSingle ? 0 : Math.min(...ass.map((as) => as.position[tgtPos]));
    const max = isSingle ? root : Math.max(...ass.map((as) => as.position[tgtPos] + as[tgtSize]));

    let basePos = 0;
    let adjust = (_: number) => 0;
    let key = 'position.x';
    if (isVertical) {
      if (type === 'left') {
        basePos = min;
      } else if (type === 'center') {
        basePos = (min + max) / 2;
        adjust = (width: number) => width / 2;
      } else if (type === 'right') {
        basePos = max;
        adjust = (width: number) => width;
      }
    }
    if (isHorizontal) {
      key = 'position.y';
      if (type === 'top') {
        basePos = min;
      } else if (type === 'middle') {
        basePos = (min + max) / 2;
        adjust = (height: number) => height / 2;
      } else if (type === 'bottom') {
        basePos = max;
        adjust = (height: number) => height;
      }
    }

    changeSchemas(
      ass.map((as) => {
        const value = round(basePos - adjust(as[isVertical ? 'width' : 'height']), 2);
        return { key, value, schemaId: as.id };
      })
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button style={buttonStyle}>
          <img width={15} onClick={() => align('left')} src={alignHorizontalLeft} />
        </button>
        <button style={buttonStyle}>
          <img width={15} onClick={() => align('center')} src={alignHorizontalCenter} />
        </button>
        <button style={buttonStyle}>
          <img width={15} onClick={() => align('right')} src={alignHorizontalRight} />
        </button>
        <button style={buttonStyle}>
          <img width={15} onClick={() => align('top')} src={alignVerticalTop} />
        </button>
        <button style={buttonStyle}>
          <img width={15} onClick={() => align('middle')} src={alignVerticalCenter} />
        </button>
        <button style={buttonStyle}>
          <img width={15} onClick={() => align('bottom')} src={alignVerticalBottom} />
        </button>
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
