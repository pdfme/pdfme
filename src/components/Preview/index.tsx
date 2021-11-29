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
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    }}
  >
    <p
      style={{
        color: 'white',
        background: 'red',
        padding: '0.25rem',
        fontSize: '12pt',
        fontWeight: 'bold',
        borderRadius: 3,
      }}
    >
      ERROR
    </p>
  </div>
);

const LabelEditorPreview = ({
  template,
  inputs,
  size,
  changeInput,
}: {
  template: Template;
  inputs: { [key: string]: string }[];
  size: PageSize;
  changeInput?: (arg: { index: number; value: string; key: string }) => void;
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
  const editable = Boolean(changeInput);

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
      <div
        style={{
          display: isOpen ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          margin: '0 auto',
        }}
      >
        <div style={{ width: paperWidth * scale, height: paperHeight * scale }}>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <div style={{ position: 'relative', ...paper }}>
              <div
                style={{
                  fontFamily: getFontFamily(template.fontName),
                  backgroundColor: '#fff',
                  border: '1px solid #999',
                  position: 'absolute',
                  ...paper,
                }}
              >
                {template.schemas.map((schema, index) => (
                  <div key={JSON.stringify(schema)}>
                    <img {...paper} src={backgrounds[index] || ''} alt="background" />
                    {Object.entries(schema || {}).map((entry) => {
                      const [key, s] = entry;
                      const tabIndex = (template.columns.findIndex((c) => c === key) || 0) + 100;

                      const value =
                        inputs[pageCursor] && inputs[pageCursor][key]
                          ? inputs[pageCursor][key]
                          : '';
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
                              {s.type === 'text' && (
                                <textarea
                                  disabled={!editable}
                                  placeholder={template.sampledata[0][key] || ''}
                                  tabIndex={tabIndex}
                                  className="nofocus placeholder-gray"
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
                                    changeInput &&
                                      changeInput({
                                        index: pageCursor,
                                        key: key,
                                        value: e.target.value,
                                      });
                                  }}
                                  value={value}
                                ></textarea>
                              )}
                              {s.type === 'image' && (
                                <div>
                                  {value ? (
                                    <div style={{ margin: '0 auto' }}>
                                      {editable && (
                                        <button
                                          tabIndex={tabIndex}
                                          style={{
                                            position: 'absolute',
                                            background: '#ff4400',
                                          }}
                                          className="delete"
                                          aria-label="close"
                                          onClick={() =>
                                            changeInput &&
                                            changeInput({
                                              index: pageCursor,
                                              key: key,
                                              value: '',
                                            })
                                          }
                                        />
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
                                      style={{
                                        height: +s.height * zoom,
                                        width: (+s.width + (s.characterSpacing || 0) * 0.75) * zoom,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
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
                                                changeInput &&
                                                  changeInput({
                                                    index: pageCursor,
                                                    key: key,
                                                    value: result as string,
                                                  });
                                              });
                                            }}
                                            type="file"
                                            accept="image/jpeg, image/png"
                                          />
                                          <span>選択</span>
                                        </>
                                      )}
                                    </label>
                                  )}
                                </div>
                              )}
                              {barcodeList.includes(s.type) && (
                                <div
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <input
                                    disabled={!editable}
                                    tabIndex={tabIndex}
                                    placeholder={template.sampledata[0][key] || ''}
                                    className="nofocus placeholder-gray"
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
                                      changeInput &&
                                        changeInput({
                                          index: pageCursor,
                                          key: key,
                                          value: e.target.value,
                                        });
                                    }}
                                  />
                                  {value &&
                                    (validateBarcodeInput(s.type, value) ? (
                                      <img
                                        src={barcodeExampleImageObj[s.type]}
                                        style={{
                                          position: 'absolute',
                                          width: '100%',
                                          height: '100%',
                                          borderRadius: 0,
                                        }}
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
