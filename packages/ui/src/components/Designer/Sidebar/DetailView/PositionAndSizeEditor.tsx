import React, { CSSProperties } from 'react';
import { SchemaForUI } from '@pdfme/common';
import { round } from '../../../../helper';
import { SidebarProps } from '../index';

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

const svgBaseProp = {
  style: { width: '100%', height: '100%' },
  xmlns: 'http://www.w3.org/2000/svg',
  enableBackground: 'new 0 0 24 24',
  height: '24px',
  viewBox: '0 0 24 24',
  width: '24px',
  fill: '#000000',
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
    {
      id: 'left',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <path d="M4,22H2V2h2V22z M22,7H6v3h16V7z M16,14H6v3h10V14z" />
        </svg>
      ),
      action: () => align('left'),
    },
    {
      id: 'center',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <polygon points="11,2 13,2 13,7 21,7 21,10 13,10 13,14 18,14 18,17 13,17 13,22 11,22 11,17 6,17 6,14 11,14 11,10 3,10 3,7 11,7" />
        </svg>
      ),
      action: () => align('center'),
    },
    {
      id: 'right',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <path d="M20,2h2v20h-2V2z M2,10h16V7H2V10z M8,17h10v-3H8V17z" />
        </svg>
      ),
      action: () => align('right'),
    },
    {
      id: 'top',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <path d="M22,2v2H2V2H22z M7,22h3V6H7V22z M14,16h3V6h-3V16z" />
        </svg>
      ),
      action: () => align('top'),
    },
    {
      id: 'middle',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <polygon points="22,11 17,11 17,6 14,6 14,11 10,11 10,3 7,3 7,11 1.84,11 1.84,13 7,13 7,21 10,21 10,13 14,13 14,18 17,18 17,13 22,13" />
        </svg>
      ),
      action: () => align('middle'),
    },
    {
      id: 'bottom',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <path d="M22,22H2v-2h20V22z M10,2H7v16h3V2z M17,8h-3v10h3V8z" />
        </svg>
      ),
      action: () => align('bottom'),
    },
    {
      id: 'vertical',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <path d="M22,2v2H2V2H22z M7,10.5v3h10v-3H7z M2,20v2h20v-2H2z" />
        </svg>
      ),
      action: () => distribute('vertical'),
    },
    {
      id: 'horizontal',
      icon: (
        <svg {...svgBaseProp}>
          <rect fill="none" height="24" width="24" />
          <path d="M4,22H2V2h2V22z M22,2h-2v20h2V2z M13.5,7h-3v10h3V7z" />
        </svg>
      ),
      action: () => distribute('horizontal'),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        {layoutBtns.map((b) => (
          <button key={b.id} title={b.id} onClick={b.action} style={buttonStyle}>
            <object width={15} height={15}>
              {b.icon}
            </object>
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
