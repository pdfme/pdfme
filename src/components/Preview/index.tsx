import { useState, useCallback, useEffect, ChangeEvent } from 'react';
import * as styles from './index.module.scss';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { Template, PageSize } from '../../type';
import { barcodeList, barcodeExampleImageObj, zoom } from '../../constants';
import {
  readFiles,
  b64toBlob,
  pdf2Pngs,
  getPdfPageSizes,
  getFontFamily,
  getA4,
  getB64BasePdf,
  validateBarcodeInput,
} from '../../utils';
import Pager from './Pager';

const BarcodeError = () => (
  <div className={styles.barcodeError}>
    <p>ERROR</p>
  </div>
);

const LabelEditorPreview = ({
  template,
  inputs,
  size,
  onChangeInput,
}: {
  template: Template;
  inputs: { [key: string]: string }[];
  size: PageSize;
  onChangeInput?: (arg: { index: number; value: string; key: string }) => void;
}) => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>(getA4());
  const [scale, setScale] = useState(0);
  const [pageCursor, setPageCursor] = useState(0);

  const init = useCallback(async () => {
    const basePdf = await getB64BasePdf(template);
    const pdfBlob = b64toBlob(basePdf);
    const pageSizes = await getPdfPageSizes(pdfBlob);
    const pageSize = pageSizes[0];
    const paperWidth = pageSize.width * zoom;
    const paperHeight = pageSize.height * zoom;
    const backgrounds = await pdf2Pngs(pdfBlob, paperWidth);

    const getScale = (size: number, paper: number) => (size / paper > 1 ? 1 : size / paper);
    const scale = Math.min(getScale(size.width, paperWidth), getScale(size.height, paperHeight));

    return { backgrounds, pageSize, scale };
  }, [template, size]);

  useEffect(() => {
    let isMounted = true;
    init().then((data) => {
      if (isMounted) {
        setPageSize(data.pageSize);
        setScale(data.scale);
        setBackgrounds(data.backgrounds);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [init]);

  const paperHeight = pageSize.height * zoom;
  const paperWidth = pageSize.width * zoom;
  const paper = { width: paperWidth, height: paperHeight };
  const isOpen = size.width !== 0;
  const editable = Boolean(onChangeInput);
  const input = inputs[pageCursor];

  return (
    <div style={{ ...size, position: 'relative', background: 'rgb(74, 74, 74)' }}>
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
      <div className={styles.previewWrapper} style={{ display: isOpen ? 'flex' : 'none' }}>
        <div style={{ width: paperWidth * scale, height: paperHeight * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <div style={{ position: 'relative', ...paper }}>
              <div
                className={styles.paper}
                style={{ fontFamily: getFontFamily(template.fontName) }}
              >
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
                                          {/* TODO 多言語化 */}
                                          <span>選択</span>
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
                                      background:
                                        editable || value ? 'rgba(255, 255, 255, 0.8)' : 'none',
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
        </div>
      </div>
    </div>
  );
};

export default LabelEditorPreview;
