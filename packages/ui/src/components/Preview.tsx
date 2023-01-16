import React, { useCallback, useRef, useState, useEffect } from 'react';
import { PreviewReactProps, SchemaForUI } from '@pdfme/common';
import { ZOOM, RULER_HEIGHT } from '../constants';
import UnitPager from './UnitPager';
import Root from './Root';
import Error from './Error';
import CtlBar from './CtlBar/index';
import Paper from './Paper';
import SchemaUI from './Schemas/SchemaUI';
import { useUIPreProcessor, useScrollPageCursor } from '../hooks';
import { templateSchemas2SchemasList, getPagesScrollTopByIndex } from '../helper';

const Preview = ({ template, inputs, size, onChangeInput }: PreviewReactProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
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
    init();
  }, [init]);

  useScrollPageCursor({
    ref: rootRef,
    pageSizes,
    scale,
    pageCursor,
    onChangePageCursor: (p) => setPageCursor(p),
  });

  const handleChangeInput = ({ key, value }: { key: string; value: string }) =>
    onChangeInput && onChangeInput({ index: unitCursor, key, value });

  const editable = Boolean(onChangeInput);
  const input = inputs[unitCursor];

  if (error) {
    return <Error size={size} error={error} />;
  }

  const pageSizesHeightSum = pageSizes.reduce(
    (acc, cur) => acc + (cur.height * ZOOM + RULER_HEIGHT * scale) * scale,
    0
  );

  return (
    <Root ref={rootRef} size={size} scale={scale}>
      <CtlBar
        size={{ height: Math.max(size.height, pageSizesHeightSum), width: size.width }}
        pageCursor={pageCursor}
        pageNum={schemasList.length}
        setPageCursor={(p) => {
          if (!rootRef.current) return;
          rootRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, p, scale);
          setPageCursor(p);
        }}
        zoomLevel={zoomLevel}
        setZoomLevel={(zoom) => {
          if (rootRef.current) {
            rootRef.current.scrollTop = getPagesScrollTopByIndex(pageSizes, pageCursor, scale);
          }
          setZoomLevel(zoom);
        }}
      />
      <UnitPager
        size={{ height: Math.max(size.height, pageSizesHeightSum), width: size.width }}
        unitCursor={unitCursor}
        unitNum={inputs.length}
        setUnitCursor={setUnitCursor}
      />

      <Paper
        paperRefs={paperRefs}
        scale={scale}
        size={size}
        schemasList={schemasList}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        renderSchema={({ schema, index }) => {
          const { key } = schema;
          const data = (input && input[key]) || '';
          return (
            <SchemaUI
              key={schema.id}
              schema={Object.assign(schema, { data })}
              editable={editable}
              placeholder={template.sampledata ? template.sampledata[0][key] : ''}
              tabIndex={index + 100}
              onChange={(value) => handleChangeInput({ key, value })}
              border={editable ? '1px dashed #4af' : 'transparent'}
            />
          );
        }}
      />
    </Root>
  );
};

export default Preview;
