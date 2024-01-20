import React, { useRef, useState, useEffect, useContext } from 'react';
import { Template, SchemaForUI, PreviewProps, Size, getDynamicTemplate } from '@pdfme/common';
import { autoTable } from '@pdfme/schemas';
import UnitPager from './UnitPager';
import Root from './Root';
import ErrorScreen from './ErrorScreen';
import CtlBar from './CtlBar';
import Paper from './Paper';
import Renderer from './Renderer';
import { useUIPreProcessor, useScrollPageCursor } from '../hooks';
import { FontContext } from '../contexts';
import {
  template2SchemasList,
  schemasList2template,
  getPagesScrollTopByIndex
} from '../helper';
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
  const templateRef = useRef<Template>(template);

  const [unitCursor, setUnitCursor] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);

  const { backgrounds, pageSizes, scale, error } = useUIPreProcessor({
    template: templateRef.current,
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
      getDynamicHeight: async (value, args, pageWidth) => {
        const body = JSON.parse(value || '[]') as string[][];
        const table = await autoTable(body, args, pageWidth);
        return table.getHeight();
      },
    })
      .then(async (dynamicTemplate) => {
        console.log('dynamicTemplate', dynamicTemplate);
        templateRef.current = dynamicTemplate;
        const sl = await template2SchemasList(dynamicTemplate);
        setSchemasList(sl);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (unitCursor > inputs.length - 1) {
      setUnitCursor(inputs.length - 1);
    }
  }, [inputs]);

  useEffect(() => {
    init(templateRef.current);
  }, []);

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
                value={content}
                mode={isForm ? 'form' : 'viewer'}
                placeholder={schema.content}
                tabIndex={index + 100}
                onChange={(arg) => {
                  const args = Array.isArray(arg) ? arg : [arg];
                  args.forEach(({ key: _key, value }) => {
                    if (_key === 'content') {
                      handleChangeInput({ key, value: value as string });
                    } else {
                      const targetSchema = schemasList[pageCursor].find(
                        (s) => s.id === schema.id
                      ) as SchemaForUI;
                      if (!targetSchema) return;

                      // @ts-ignore
                      targetSchema[_key] = value as string;
                      setSchemasList([...schemasList]);
                    }
                  });
                  init(schemasList2template(schemasList, templateRef.current.basePdf));
                }}
                outline={
                  isForm && !schema.readOnly ? `1px dashed ${token.colorPrimary}` : 'transparent'
                }
                pageSize={pageSizes[pageCursor]}
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
