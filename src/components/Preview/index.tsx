import { useState, ChangeEvent, useContext } from 'react';
import * as styles from './index.module.scss';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { PreviewProp } from '../../type';
import { barcodeList, barcodeExampleImageObj, zoom, rulerHeight } from '../../constants';
import { readFiles, getFontFamily, validateBarcodeInput } from '../../utils';
import Pager from './Pager';
import { I18nContext } from '../../i18n';
import BarcodeError from '../BarcodeError';
import { useUiPreProcessor } from '../../hooks';

const LabelEditorPreview = ({ template, inputs, size, onChangeInput }: PreviewProp) => {
  const i18n = useContext(I18nContext);

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
                    <Tippy delay={0} interactive content={key}>
                      <div
                        style={{
                          position: 'absolute',
                          height: +s.height * zoom,
                          width: +s.width * zoom,
                          top: +s.position.y * zoom + index * paperHeight,
                          left: +s.position.x * zoom,
                          border: `1px dashed ${editable ? '#4af' : '#777'}`,
                          backgroundColor:
                            s.type === 'text' && s.backgroundColor
                              ? s.backgroundColor
                              : 'transparent',
                        }}
                      >
                        {/* TODO Editor/Mainと共通化 */}
                        {s.type === 'text' && (
                          <textarea
                            disabled={!editable}
                            placeholder={template.sampledata[0][key] || ''}
                            tabIndex={tabIndex}
                            className={`${styles.nofocus} ${styles.placeholderGray}`}
                            style={{
                              resize: 'none',
                              fontFamily: 'inherit',
                              height: s.height * zoom,
                              width: (s.width + (s.characterSpacing || 0) * 0.75) * zoom, // 横幅を伸ばす1ポイントは0.75ピクセル
                              textAlign: s.alignment,
                              fontSize: s.fontSize + 'pt',
                              letterSpacing: s.characterSpacing + 'pt',
                              fontFeatureSettings: `"palt"`,
                              lineHeight: s.lineHeight + 'em',
                              whiteSpace: 'pre-line',
                              wordBreak: 'break-all',
                              background: 'transparent',
                              border: 'none',
                              color: s.fontColor || '#000',
                            }}
                            onChange={(e) => {
                              onChangeInput &&
                                onChangeInput({
                                  index: pageCursor,
                                  key: key,
                                  value: e.target.value,
                                });
                            }}
                            value={value}
                          ></textarea>
                        )}
                        {s.type === 'image' && (
                          // {/* TODO Editor/Mainと共通化 */}
                          <div>
                            {value ? (
                              <div style={{ margin: '0 auto' }}>
                                {editable && (
                                  <button
                                    tabIndex={tabIndex}
                                    className={styles.dltBtn}
                                    aria-label="close"
                                    onClick={() =>
                                      onChangeInput &&
                                      onChangeInput({
                                        index: pageCursor,
                                        key: key,
                                        value: '',
                                      })
                                    }
                                  >
                                    x
                                  </button>
                                )}
                                <img
                                  style={{
                                    width: s.width * zoom,
                                    height: s.height * zoom,
                                    borderRadius: 0,
                                  }}
                                  src={value}
                                />
                              </div>
                            ) : (
                              <label
                                className={styles.imageLabel}
                                style={{
                                  height: +s.height * zoom,
                                  width: (+s.width + (s.characterSpacing || 0) * 0.75) * zoom,
                                }}
                              >
                                {editable && (
                                  <>
                                    <input
                                      tabIndex={tabIndex}
                                      style={{ display: 'none' }}
                                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                        const files = event.target.files;
                                        readFiles(files, 'dataURL').then((result) => {
                                          onChangeInput &&
                                            onChangeInput({
                                              index: pageCursor,
                                              key: key,
                                              value: result as string,
                                            });
                                        });
                                      }}
                                      type="file"
                                      accept="image/jpeg, image/png"
                                    />
                                    <span>{i18n('select')}</span>
                                  </>
                                )}
                              </label>
                            )}
                          </div>
                        )}
                        {barcodeList.includes(s.type) && (
                          // {/* TODO Editor/Mainと共通化 */}
                          <div className={styles.barcodeWrapper}>
                            <input
                              disabled={!editable}
                              tabIndex={tabIndex}
                              placeholder={template.sampledata[0][key] || ''}
                              className={`${styles.nofocus} ${styles.placeholderGray}`}
                              style={{
                                textAlign: 'center',
                                position: 'absolute',
                                zIndex: 2,
                                fontSize: 'inherit',
                                height: +s.height * zoom,
                                width: (+s.width + (s.characterSpacing || 0) * 0.75) * zoom,
                                background: editable || value ? 'rgba(255, 255, 255, 0.8)' : 'none',
                                border: 'none',
                              }}
                              value={value}
                              onChange={(e) => {
                                onChangeInput &&
                                  onChangeInput({
                                    index: pageCursor,
                                    key: key,
                                    value: e.target.value,
                                  });
                              }}
                            />
                            {value &&
                              (validateBarcodeInput(s.type, value) ? (
                                <img
                                  className={styles.barcodeImage}
                                  src={barcodeExampleImageObj[s.type]}
                                />
                              ) : (
                                <BarcodeError />
                              ))}
                          </div>
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
