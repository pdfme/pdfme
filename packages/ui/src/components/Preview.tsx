import React, { useRef, useState, useEffect, useContext } from 'react';
import { Template, SchemaForUI, PreviewProps, Size, getDynamicTemplate } from '@pdfme/common';
import { createSingleTable, createMultiTables } from '@pdfme/schemas';
import UnitPager from './UnitPager';
import Root from './Root';
import ErrorScreen from './ErrorScreen';
import CtlBar from './CtlBar';
import Paper from './Paper';
import Renderer from './Renderer';
import { useUIPreProcessor, useScrollPageCursor } from '../hooks';
import { FontContext } from '../contexts';
import { template2SchemasList, getPagesScrollTopByIndex, cloneDeep } from '../helper';
import { theme } from 'antd';

const _cache = new Map();

const Preview = ({
  template,
  inputs,
  size,
  onChangeInput,
}: Omit<PreviewProps, 'domContainer'> & {
  onChangeInput?: (args: { index: number; value: string; key: string }) => void;
  size: Size;
}) => {
  const { token } = theme.useToken();

  const font = useContext(FontContext);

  const containerRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const [unitCursor, setUnitCursor] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);

  const { backgrounds, pageSizes, scale, error, refresh } = useUIPreProcessor({
    template,
    size,
    zoomLevel,
  });

  const isForm = Boolean(onChangeInput);

  const input = inputs[unitCursor];

  const init = (template: Template) => {
    const options = { font };
    getDynamicTemplate({
      template,
      input,
      options,
      _cache,
      // TODO ここから
      modifyTemplate: async (t: Template) => {
        const template: Template = Object.assign(cloneDeep(t), { schemas: [] });
        let pageIndex = 0;
        for (const schemaObj of t.schemas) {
          const additionalSchemaObj: typeof schemaObj = {};
          for (const [key, schema] of Object.entries(schemaObj)) {
            if (schema.type === 'table') {
              schema.__bodyRange = undefined;
              const body = JSON.parse(input[key] || '[]') as string[][];
              const tables = await createMultiTables(body, { schema, basePdf: template.basePdf, options, _cache });
              if (tables.length > 1) {
                const table0 = tables[0];
                const table1 = tables[1];
                schema.__bodyRange = { start: 0, end: table0.body.length };

                // const newKey = key + '@pdfme/table/${0}';
                const newKey = key;
                // ここから直す必要がある pushされる template.schemasの場所がおかしい
                additionalSchemaObj[newKey] = {
                  ...schema,
                  position: { x: schema.position.x, y: table1.settings.startY },
                  height: table1.getHeight(),
                  showHead: false,
                  __bodyRange: { start: table0.body.length },
                  content: input[key],
                };
                if (input[newKey] !== input[key] && onChangeInput) {
                  onChangeInput({ index: unitCursor, key: newKey, value: input[key] });
                }
              }
            }
          }
          template.schemas.push(schemaObj);
          // ここで分割したテーブルがある場合は追加するべき？
          if (Object.keys(additionalSchemaObj).length > 0) {
            if (!t.schemas[pageIndex + 1]) {
              template.schemas.push(additionalSchemaObj);
            } else {
              template.schemas[pageIndex + 1] = additionalSchemaObj;
            }
          }
          pageIndex++;
        }
        return template
      },
      getDynamicHeight: async (value, args) => {
        console.log('getDynamicHeight', value, args)
        if (args.schema.type !== 'table') return args.schema.height;
        const body = JSON.parse(value || '[]') as string[][];
        const table = await createSingleTable(body, args);
        return table.getHeight();
      },
    })
      .then(async (dynamicTemplate) => {
        console.log('dynamicTemplate', dynamicTemplate)
        const sl = await template2SchemasList(dynamicTemplate);
        setSchemasList(sl);
        await refresh(dynamicTemplate);
      })
      .catch((err) => console.error(`[@pdfme/ui] `, err));
  };

  useEffect(() => {
    if (unitCursor > inputs.length - 1) {
      setUnitCursor(inputs.length - 1);
    }

    init(template);
  }, [template, inputs]);

  useScrollPageCursor({
    ref: containerRef,
    pageSizes,
    scale,
    pageCursor,
    onChangePageCursor: setPageCursor,
  });

  const handleChangeInput = ({ key, value }: { key: string; value: string }) =>
    onChangeInput && onChangeInput({ index: unitCursor, key, value });

  if (error) {
    return <ErrorScreen size={size} error={error} />;
  }

  return (
    <Root size={size} scale={scale}>
      <CtlBar
        size={size}
        pageCursor={pageCursor}
        pageNum={schemasList.length}
        setPageCursor={(p) => {
          if (!containerRef.current) return;
          containerRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, scale);
          setPageCursor(p);
        }}
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
      />
      <UnitPager
        size={size}
        unitCursor={unitCursor}
        unitNum={inputs.length}
        setUnitCursor={setUnitCursor}
      />
      <div ref={containerRef} style={{ ...size, position: 'relative', overflow: 'auto' }}>
        <Paper
          paperRefs={paperRefs}
          scale={scale}
          size={size}
          schemasList={schemasList}
          pageSizes={pageSizes}
          backgrounds={backgrounds}
          renderSchema={({ schema, index }) => {
            const { key, readOnly } = schema;
            const content = readOnly ? schema.content || '' : (input && input[key]) || '';
            return (
              <Renderer
                key={schema.id}
                schema={schema}
                basePdf={template.basePdf}
                value={content}
                mode={isForm ? 'form' : 'viewer'}
                placeholder={schema.content}
                tabIndex={index + 100}
                onChange={(arg) => {
                  const args = Array.isArray(arg) ? arg : [arg];
                  args.forEach(({ key: _key, value }) => {
                    if (_key === 'content') {
                      handleChangeInput({ key, value: value as string });
                      // TODO これが 不要な時(tableの行数が追加された時以外)に動くと無駄にレンダリングが走る
                      init(template);
                    } else {
                      const targetSchema = schemasList[pageCursor].find(
                        (s) => s.id === schema.id
                      ) as SchemaForUI;
                      if (!targetSchema) return;

                      // @ts-ignore
                      targetSchema[_key] = value as string;
                    }
                  });
                  setSchemasList([...schemasList]);
                }}
                outline={
                  isForm && !schema.readOnly ? `1px dashed ${token.colorPrimary}` : 'transparent'
                }
                scale={scale}
              />
            );
          }}
        />
      </div>
    </Root>
  );
};

export default Preview;
