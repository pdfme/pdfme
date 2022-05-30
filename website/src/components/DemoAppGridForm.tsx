import React from 'react';
import { ReactGrid, Row, CellChange, DefaultCellTypes, Column, TextCell } from '@silevis/reactgrid';
import '@silevis/reactgrid/styles.css';
import { cloneDeep } from '../libs/helper';

const getRows = (datas: { [key: string]: string }[]): Row[] => [
  {
    rowId: 'header',
    cells: [{ type: 'header', text: '' } as DefaultCellTypes].concat(
      Object.keys(datas[0] || {}).map((key) => ({ type: 'header', text: key }))
    ),
  },
  ...datas.map<Row>((data, idx) => ({
    rowId: idx,
    cells: [
      {
        type: 'text',
        text: String(idx),
        nonEditable: true,
        style: {
          background: 'rgba(128, 128, 128, 0.1)',
        },
      } as DefaultCellTypes,
    ].concat(Object.keys(data).map((key) => ({ type: 'text', text: data[key] }))),
  })),
];

const getColumns = (datas: { [key: string]: string }[]) =>
  [{ columnId: 'row', width: 40 } as Column].concat(
    Object.keys(datas[0] || {}).map((key) => ({ columnId: key }))
  );

const DemoAppGridForm = (props: {
  datas: { [key: string]: string }[];
  setDatas: (value: { [key: string]: string }[]) => void;
}) => {
  const { datas, setDatas } = props;
  const handleChanges = (changes: CellChange<TextCell>[]) => {
    const _datas = cloneDeep(datas);
    changes.forEach((change) => {
      const index = change.rowId;
      const fieldName = change.columnId;
      _datas[index][fieldName] = change.newCell.text;
    });
    setDatas(_datas);
  };

  return (
    <div style={{ background: '#fff', color: '#333' }}>
      <ReactGrid
        stickyTopRows={1}
        rows={getRows(datas)}
        columns={getColumns(datas)}
        onCellsChanged={handleChanges}
        enableRangeSelection
        enableColumnSelection
        enableRowSelection
      />
    </div>
  );
};

export default DemoAppGridForm;
