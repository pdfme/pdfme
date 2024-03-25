import React, { useRef, useState, useEffect, useContext } from 'react';
import { Template, SchemaForUI, PreviewProps, Size, getDynamicTemplate } from '@pdfme/common';
import { modifyTemplateForTable, getDynamicHeightForTable } from '@pdfme/schemas';
import UnitPager from './UnitPager';
import Root from './Root';
import ErrorScreen from './ErrorScreen';
import CtlBar from './CtlBar';
import Paper from './Paper';
import Renderer from './Renderer';
import { useUIPreProcessor, useScrollPageCursor } from '../hooks';
import { FontContext } from '../contexts';
import { template2SchemasList, getPagesScrollTopByIndex } from '../helper';
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

  const { backgrounds, pageSizes, scale, error, refresh } =
    useUIPreProcessor({ template, size, zoomLevel });

  const isForm = Boolean(onChangeInput);

  const input = inputs[unitCursor];

  const init = (template: Template) => {
    const options = { font };
    getDynamicTemplate({
      template,
      input,
      options,
      _cache,
      modifyTemplate: (arg) => {
        return modifyTemplateForTable(arg);
      },
      getDynamicHeight: (value, args) => {
        if (args.schema.type !== 'table') return Promise.resolve(args.schema.height);
        return getDynamicHeightForTable(value, args);
      },
    })
      .then(async (dynamicTemplate) => {
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
  }, [template, inputs, size]);

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
            const content = readOnly ? String(schema.content) || '' : String(input && input[key] || '');
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
                  let isNeedInit = false;
                  args.forEach(({ key: _key, value }) => {
                    if (_key === 'content') {
                      const newValue = value as string;
                      const oldValue = (input?.[key] as string) || '';
                      if (newValue === oldValue) return;
                      handleChangeInput({ key, value: newValue });
                      // TODO Set to true only if the execution of getDynamicTemplate, such as for a table, is required.
                      isNeedInit = true;
                    } else {
                      const targetSchema = schemasList[pageCursor].find(
                        (s) => s.id === schema.id
                      ) as SchemaForUI;
                      if (!targetSchema) return;

                      // @ts-ignore
                      targetSchema[_key] = value as string;
                    }
                  });
                  if (isNeedInit) {
                    init(template);
                  }
                  setSchemasList([...schemasList])
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
