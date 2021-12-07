import { useState } from 'react';
import * as styles from './index.module.scss';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { PreviewProp } from '../../type';
import { barcodeList, zoom, rulerHeight } from '../../constants';
import { getFontFamily } from '../../utils';
import Pager from './Pager';
import TextSchema from '../TextSchema';
import ImageSchema from '../ImageSchema';
import BarcodeSchema from '../BarcodeSchema';
import { useUiPreProcessor } from '../../hooks';

const LabelEditorPreview = ({ template, inputs, size, onChangeInput }: PreviewProp) => {
  const offset = rulerHeight;
  const { backgrounds, pageSizes, scale } = useUiPreProcessor({ template, size, offset });

  const [pageCursor, setPageCursor] = useState(0);

  if (!pageSizes[0]) return <></>;
  const paperHeight = pageSizes[0].height * zoom;
  const paperWidth = pageSizes[0].width * zoom;
  const paper = { width: paperWidth, height: paperHeight };
  const isOpen = size.width !== 0;
  const editable = Boolean(onChangeInput);
  const input = inputs[pageCursor];

  const handleChangeInput = ({ key, value }: { key: string; value: string }) => {
    if (onChangeInput) {
      onChangeInput({ index: pageCursor, key, value });
    }
  };

  return (
    <div className={styles.wrapper} style={{ ...size }}>
      {/* TODO Must consider external font */}
      {/* <Helmet>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP&family=Noto+Serif+JP&display=swap"
          rel="stylesheet"
        />
      </Helmet> */}
      <Pager
        isOpen={isOpen}
        pageCursor={pageCursor}
        pageNum={inputs.length}
        setPageCursor={setPageCursor}
      />
      <div
        className={styles.previewWrapper}
        style={{
          display: isOpen ? 'block' : 'none',
          maxHeight: size.height,
          maxWidth: size.width,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          top: offset / 2,
          left: -((paper.width - size.width) * scale) / 2,
          position: 'absolute',
        }}
      >
        <div className={styles.paper} style={{ fontFamily: getFontFamily(template.fontName) }}>
          {template.schemas.map((schema, index) => (
            <div key={JSON.stringify(schema)}>
              <img {...paper} src={backgrounds[index] || ''} alt="background" />
              {Object.entries(schema || {}).map((entry) => {
                const [key, s] = entry;
                const tabIndex = (template.columns.findIndex((c) => c === key) || 0) + 100;
                const value = input && input[key] ? input[key] : '';
                return (
                  <div key={key}>
                    {/* TODO ここごとコンポーネント化できるのでは？ */}
                    <Tippy delay={0} interactive content={key}>
                      <div
                        // TODO このスタイルは共通化できそう
                        style={{
                          position: 'absolute',
                          height: +s.height * zoom,
                          width: +s.width * zoom,
                          top: +s.position.y * zoom + index * paperHeight,
                          left: +s.position.x * zoom,
                          border: `1px dashed ${editable ? '#4af' : 'transparent'}`,
                          backgroundColor:
                            s.type === 'text' && s.backgroundColor
                              ? s.backgroundColor
                              : 'transparent',
                        }}
                      >
                        {s.type === 'text' && (
                          <TextSchema
                            schema={s}
                            value={value}
                            editable={editable}
                            placeholder={template.sampledata[0][key] || ''}
                            tabIndex={tabIndex}
                            onChange={(value) => handleChangeInput({ key, value })}
                          />
                        )}
                        {s.type === 'image' && (
                          <ImageSchema
                            schema={s}
                            value={value}
                            editable={editable}
                            placeholder={template.sampledata[0][key] || ''}
                            tabIndex={tabIndex}
                            onChange={(value) => handleChangeInput({ key, value })}
                          />
                        )}
                        {barcodeList.includes(s.type) && (
                          <BarcodeSchema
                            schema={s}
                            value={value}
                            editable={editable}
                            placeholder={template.sampledata[0][key] || ''}
                            tabIndex={tabIndex}
                            onChange={(value) => handleChangeInput({ key, value })}
                          />
                        )}
                      </div>
                    </Tippy>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LabelEditorPreview;
