import React, { useCallback, useRef, useState, useEffect } from 'react';
import { PreviewReactProps, Schema } from '../../libs/type';
import { zoom, rulerHeight } from '../../libs/constants';
import { templateSchemas2SchemasList } from '../../libs/helper';
import Pager from './Pager';
import UnitPager from './UnitPager';
import Root from '../Root';
import Error from '../Error';
import Paper from '../Paper';
import SchemaUI from '../Schemas/SchemaUI';
import { useUiPreProcessor, useScrollPageCursor } from '../../libs/hooks';

const Preview = ({ template, inputs, size, onChangeInput }: PreviewReactProps) => {
  const { backgrounds, pageSizes, scale, error } = useUiPreProcessor({
    template,
    size,
    offset: rulerHeight,
  });

  const rootRef = useRef<HTMLDivElement>(null);

  const [unitCursor, setUnitCursor] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);
  const [schemasList, setSchemasList] = useState<Schema[][]>([[]] as Schema[][]);

  const init = useCallback(async () => {
    const sl = await templateSchemas2SchemasList(template);
    setSchemasList(sl);
  }, [template]);

  useEffect(() => {
    init();
  }, [init]);

  useScrollPageCursor({
    rootRef,
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

  return (
    <Root ref={rootRef} size={size} scale={scale}>
      <UnitPager unitCursor={unitCursor} unitNum={inputs.length} setUnitCursor={setUnitCursor} />
      <Pager
        pageCursor={pageCursor}
        pageNum={schemasList.length}
        setPageCursor={(p) => {
          if (!rootRef.current) return;
          rootRef.current.scrollTop = pageSizes
            .slice(0, p)
            .reduce((acc, cur) => acc + (cur.height * zoom + rulerHeight) * scale, 0);
          setPageCursor(p);
        }}
      />
      <Paper
        scale={scale}
        schemas={schemasList[pageCursor]}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        renderSchema={({ schema, index }) => {
          const { key } = schema;
          const data = input[key] ? input[key] : '';

          return (
            <SchemaUI
              key={key}
              schema={Object.assign(schema, { key, id: key, data })}
              editable={editable}
              placeholder={template.sampledata ? template.sampledata[0][key] : ''}
              tabIndex={index}
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
