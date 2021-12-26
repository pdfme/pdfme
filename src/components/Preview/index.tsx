import React, { useRef, useState } from 'react';
import { PreviewUIProp } from '../../libs/class';
import { zoom, rulerHeight } from '../../libs/constants';
import Pager from './Pager';
import UnitPager from './UnitPager';
import Root from '../Root';
import Paper from '../Paper';
import Schema from '../Schemas';
import { useUiPreProcessor, useScrollPageCursor } from '../../libs/hooks';

const Preview = ({ template, inputs, size, onChangeInput }: PreviewUIProp) => {
  const { backgrounds, pageSizes, scale } = useUiPreProcessor({
    template,
    size,
    offset: rulerHeight,
  });

  const rootRef = useRef<HTMLDivElement>(null);

  const [unitCursor, setUnitCursor] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);

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
  const { schemas } = template;

  return (
    <Root ref={rootRef} size={size} scale={scale}>
      <UnitPager unitCursor={unitCursor} unitNum={inputs.length} setUnitCursor={setUnitCursor} />
      <Pager
        pageCursor={pageCursor}
        pageNum={schemas.length}
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
        schemas={schemas}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        render={({ schema }) =>
          Object.entries(schema).map((entry) => {
            const [key, s] = entry;

            return (
              <Schema
                key={key}
                schema={Object.assign(s, { key, id: key, data: input[key] ? input[key] : '' })}
                editable={editable}
                placeholder={template.sampledata ? template.sampledata[0][key] : ''}
                tabIndex={((template.columns ?? []).findIndex((c) => c === key) || 0) + 100}
                onChange={(value) => handleChangeInput({ key, value })}
                border={editable ? '1px dashed #4af' : 'transparent'}
              />
            );
          })
        }
      />
    </Root>
  );
};

export default Preview;
