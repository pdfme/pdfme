import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { SchemaForUI, PreviewProps, Size } from '@pdfme/common';
import UnitPager from './UnitPager';
import Root from './Root';
import ErrorScreen from './ErrorScreen';
import CtlBar from './CtlBar';
import Paper from './Paper';
import Renderer from './Renderer';
import { useUIPreProcessor, useScrollPageCursor } from '../hooks';
import { templateSchemas2SchemasList, getPagesScrollTopByIndex } from '../helper';
import { theme } from 'antd';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<HTMLDivElement[]>([]);

  const [unitCursor, setUnitCursor] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);

  const { backgrounds, pageSizes, scale, error } = useUIPreProcessor({ template, size, zoomLevel });

  const init = useCallback(async () => {
    const sl = await templateSchemas2SchemasList(template);
    setSchemasList(sl);
  }, [template]);

  useEffect(() => {
    if (unitCursor > inputs.length - 1) {
      setUnitCursor(inputs.length - 1);
    }
  }, [inputs]);

  useEffect(() => {
    void init();
  }, [init]);

  useScrollPageCursor({
    ref: containerRef,
    pageSizes,
    scale,
    pageCursor,
    onChangePageCursor: (p) => setPageCursor(p),
  });

  const handleChangeInput = ({ key, value }: { key: string; value: string }) =>
    onChangeInput && onChangeInput({ index: unitCursor, key, value });

  const isForm = Boolean(onChangeInput);

  const input = inputs[unitCursor];

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
                      const targetSchema = schemasList[pageCursor].find((s) => s.id === schema.id);
                      if (!targetSchema || !targetSchema[_key]) return;
                      targetSchema[_key] = value as string;
                      setSchemasList([...schemasList]);
                    }
                  });
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
