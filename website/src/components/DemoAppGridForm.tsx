import React from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';

registerAllModules();

const DemoAppGridForm = ({
  datas,
  setDatas,
}: {
  datas: { [key: string]: string }[];
  setDatas: (value: { [key: string]: string }[]) => void;
}) => {
  return (
    <HotTable
      settings={{
        afterChange: (changes) => {
          if (!changes) return;
          for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            const [row, column, _, nextValue] = change;
            datas[row][column] = nextValue ?? '';
          }
          setDatas(datas);
        },
        colHeaders: datas[0] ? Object.keys(datas[0]) : [],
        data: datas,
        rowHeaders: true,
        stretchH: 'all',
        width: '100%',
        height: 500,
        licenseKey: 'non-commercial-and-evaluation',
      }}
    />
  );
};

export default DemoAppGridForm;
