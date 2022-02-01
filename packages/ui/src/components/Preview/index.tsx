import React, { useCallback, useRef, useState, useEffect } from 'react';
import { PreviewReactProps, SchemaForUI } from '../../../../common/src/type';
import { ZOOM, RULER_HEIGHT } from '../../../../common/src/constants';
import PagePager from './Pager/Page';
import UnitPager from './Pager/Unit';
import Root from '../Root';
import Error from '../Error';
import Paper from '../Paper';
import SchemaUI from '../Schemas/SchemaUI';
import { useUIPreProcessor, useScrollPageCursor } from '../../libs/hooks';
import { templateSchemas2SchemasList } from '../../libs/helper';

const Preview = ({ template, inputs, size, onChangeInput }: PreviewReactProps) => {
  const { backgrounds, pageSizes, scale, error } = useUIPreProcessor({
    template,
    size,
    offset: RULER_HEIGHT,
  });

  const rootRef = useRef<HTMLDivElement>(null);

  const [unitCursor, setUnitCursor] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);
  const [schemasList, setSchemasList] = useState<SchemaForUI[][]>([[]] as SchemaForUI[][]);

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
      <div
        style={{
          height: pageSizes.reduce((acc, cur) => acc + cur.height * ZOOM, 0),
          width: '100%',
          position: 'absolute',
        }}
      >
        <UnitPager unitCursor={unitCursor} unitNum={inputs.length} setUnitCursor={setUnitCursor} />
        <PagePager
          pageCursor={pageCursor}
          pageNum={schemasList.length}
          setPageCursor={(p) => {
            if (!rootRef.current) return;
            rootRef.current.scrollTop = pageSizes
              .slice(0, p)
              .reduce((acc, cur) => acc + (cur.height * ZOOM + RULER_HEIGHT) * scale, 0);
            setPageCursor(p);
          }}
        />
      </div>
      <Paper
        scale={scale}
        size={size}
        schemasList={schemasList}
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
