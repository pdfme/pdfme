import React from 'react';
import { SidebarProps } from '..';

const inputSetStyle: React.CSSProperties = {
  marginRight: '1rem',
  display: 'flex',
  alignItems: 'center',
};

const PositionAndSizeEditor = (
  props: Pick<SidebarProps, 'pageSize' | 'changeSchemas' | 'activeSchema'>
) => {
  const { changeSchemas, activeSchema, pageSize } = props;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={inputSetStyle}>
          <label style={{ width: 17 }}>X</label>
          <input
            style={{ width: 70 }}
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
            style={{ width: 70 }}
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.25rem',
        }}
      >
        <div style={inputSetStyle}>
          <label style={{ width: 17 }}>W</label>
          <input
            style={{ width: 70 }}
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
            style={{ width: 70 }}
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
