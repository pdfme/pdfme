import { useRef, useState, useEffect } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import Selecto from 'react-selecto';
import Moveable, { OnDrag, OnResize } from 'react-moveable';
import Guides from '@scena/react-guides';
import * as styles from './index.module.scss';
import { GuidesInterface, Schema, PageSize } from '../../../type';
import { round, flatten, getFontFamily } from '../../../utils';
import { barcodeList, zoom, rulerHeight, barcodeExampleImageObj } from '../../../constants';

const SELECTABLE = 'selectable';

const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => String(round(fmt4Num(prop) / zoom, 2));
interface Props {
  pageCursor: number;
  scale: number;
  backgrounds: string[];
  pageSizes: PageSize[];
  activeElements: HTMLElement[];
  schemas: Schema[][];
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onSelectSchemas: (targets: HTMLElement[]) => void;
  focusElementId: string;
  changeSchema: (obj: { key: string; value: string; schemaId: string }[]) => void;
}

const Main = ({
  pageCursor,
  scale,
  backgrounds,
  pageSizes,
  activeElements,
  schemas,
  onSelectSchemas,
  onMouseEnter,
  onMouseLeave,
  focusElementId,
  changeSchema,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const verticalGuides = useRef<GuidesInterface[]>([]);
  const horizontalGuides = useRef<GuidesInterface[]>([]);
  const moveable = useRef<any>(null);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.shiftKey) {
      setIsPressShiftKey(true);
    }
  };
  const onKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      setIsPressShiftKey(false);
    }
  };

  const [isPressShiftKey, setIsPressShiftKey] = useState(false);

  const initEvents = () => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('keyup', onKeyup);
  };

  const destroyEvents = () => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
  };

  useEffect(() => {
    initEvents();
    return destroyEvents;
  }, []);

  useEffect(() => {
    moveable.current && moveable.current.updateRect();
  }, [schemas, pageSizes, backgrounds]);

  const onDrag = ({ target, left, top }: OnDrag) => {
    target!.style.left = (left < 0 ? 0 : left) + 'px';
    target!.style.top = (top < 0 ? 0 : top) + 'px';
  };

  const onResize = ({ target, width, height, direction }: OnResize) => {
    const s = target!.style;
    const newLeft = Number(fmt4Num(s.left)) + (Number(fmt4Num(s.width)) - width);
    const newTop = Number(fmt4Num(s.top)) + (Number(fmt4Num(s.height)) - height);
    const obj: any = { width: `${width}px`, height: `${height}px` };
    const d = direction.toString();
    if (d === '-1,-1' || d === '-1,0' || d === '0,-1') {
      obj.top = `${newTop}px`;
      obj.left = `${newLeft}px`;
    } else if (d === '1,-1') {
      obj.top = `${newTop}px`;
    } else if (d === '-1,1') {
      obj.left = `${newLeft}px`;
    }
    Object.assign(s, obj);
  };

  const onDragEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { top, left } = target.style;
    changeSchema([
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  const onResizeEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { width, height, top, left } = target.style;
    changeSchema([
      { key: 'width', value: fmt(width), schemaId: target.id },
      { key: 'height', value: fmt(height), schemaId: target.id },
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  const onDragEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map((target) => {
      const { top, left } = target.style;
      return [
        { key: 'position.y', value: fmt(top), schemaId: target.id },
        { key: 'position.x', value: fmt(left), schemaId: target.id },
      ];
    });
    changeSchema(flatten(arg));
  };

  const onResizeEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map((target) => {
      const { width, height, top, left } = target.style;
      return [
        { key: 'width', value: fmt(width), schemaId: target.id },
        { key: 'height', value: fmt(height), schemaId: target.id },
        { key: 'position.y', value: fmt(top), schemaId: target.id },
        { key: 'position.x', value: fmt(left), schemaId: target.id },
      ];
    });
    changeSchema(flatten(arg));
  };

  const getGuideLines = (guides: GuidesInterface[], index: number) =>
    guides[index].getGuides().map((g) => g * zoom + rulerHeight);

  return (
    <div ref={wrapRef}>
      {backgrounds.map((background, index) => {
        const pageSize = pageSizes[index];
        if (!pageSize) {
          return null;
        }
        const paperHeight = pageSize.height * zoom;
        const paperWidth = pageSize.width * zoom;
        return (
          <div
            key={background.slice(-10) + index}
            style={{
              width: paperWidth * scale,
              height: paperHeight * scale,
              position: 'relative',
              margin: '0 auto',
              left: (-rulerHeight * scale) / 2,
            }}
          >
            <Selecto
              container={wrapRef.current}
              selectFromInside={false}
              continueSelect={false}
              selectByClick={true}
              preventDefault
              selectableTargets={[`.${SELECTABLE}`]}
              hitRate={0}
              onDragStart={(e) => {
                const inputEvent = e.inputEvent;
                const target = inputEvent.target;
                if (
                  (inputEvent.type === 'touchstart' && e.isTrusted) ||
                  (moveable.current && moveable.current.isMoveableElement(target))
                ) {
                  e.stop();
                }
              }}
              onSelect={(e: any) => {
                e.stop();
                onSelectSchemas(e.selected as HTMLElement[]);
              }}
            />

            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              {pageCursor !== index && (
                <div
                  style={{
                    position: 'absolute',
                    width: paperWidth + rulerHeight,
                    height: paperHeight,
                    zIndex: 100,
                    background: '#9e9e9e94',
                  }}
                />
              )}
              <div
                style={{
                  width: paperWidth + rulerHeight,
                  height: paperHeight + rulerHeight,
                  position: 'relative',
                  background: '#333',
                }}
              >
                {pageCursor === index &&
                  activeElements.length !== 0 &&
                  horizontalGuides.current[index] &&
                  verticalGuides.current[index] && (
                    <Moveable
                      ref={(e: any) => {
                        moveable.current = e;
                      }}
                      target={activeElements}
                      style={{ zIndex: 1 }}
                      bounds={{
                        left: 0,
                        top: 0,
                        bottom: paperHeight + rulerHeight,
                        right: paperWidth + rulerHeight,
                      }}
                      snappable
                      snapCenter
                      horizontalGuidelines={getGuideLines(horizontalGuides.current, index)}
                      verticalGuidelines={getGuideLines(verticalGuides.current, index)}
                      draggable
                      resizable
                      keepRatio={isPressShiftKey}
                      throttleDrag={1}
                      throttleResize={1}
                      onDrag={onDrag}
                      onDragGroup={({ events }) => {
                        events.forEach(onDrag);
                      }}
                      onDragEnd={onDragEnd}
                      onDragGroupEnd={onDragEnds}
                      onResize={onResize}
                      onResizeGroup={({ events }) => {
                        events.forEach(onResize);
                      }}
                      onResizeEnd={onResizeEnd}
                      onResizeGroupEnd={onResizeEnds}
                    />
                  )}
                <Guides
                  zoom={zoom}
                  style={{
                    display: pageCursor === index ? 'inherit' : 'none',
                    position: 'absolute',
                    top: 0,
                    left: rulerHeight,
                    height: rulerHeight,
                    width: paperWidth,
                  }}
                  type="horizontal"
                  ref={(e) => {
                    horizontalGuides.current[index] = e!;
                  }}
                />
                <Guides
                  zoom={zoom}
                  style={{
                    display: pageCursor === index ? 'inherit' : 'none',
                    position: 'absolute',
                    top: rulerHeight,
                    left: 0,
                    height: paperHeight,
                    width: rulerHeight,
                  }}
                  type="vertical"
                  ref={(e) => {
                    verticalGuides.current[index] = e!;
                  }}
                />

                <div
                  id={`paper-${index}`}
                  style={{
                    fontFamily: getFontFamily(),
                    backgroundColor: '#fff',
                    position: 'absolute',
                    top: rulerHeight,
                    left: rulerHeight,
                    width: paperWidth,
                    height: paperHeight,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: paperWidth,
                      height: paperHeight,
                    }}
                  >
                    <img className={styles.paperImage} src={background} alt="background" />
                  </div>
                  {(schemas[index] || []).map((s) => (
                    <div key={s.id}>
                      <Tippy delay={0} interactive content={s.key}>
                        <div
                          className={`${SELECTABLE}`}
                          onMouseEnter={() => onMouseEnter(s.id)}
                          onMouseLeave={() => onMouseLeave()}
                          id={s.id}
                          style={{
                            display: 'block',
                            position: 'absolute',
                            height: +s.height * zoom,
                            width: +s.width * zoom,
                            top: +s.position.y * zoom,
                            left: +s.position.x * zoom,
                            border:
                              focusElementId === s.id ? '1px solid #d42802' : '1px dashed #4af',
                            backgroundColor:
                              s.type === 'text' && s.backgroundColor
                                ? s.backgroundColor
                                : 'transparent',
                          }}
                        >
                          {s.type === 'text' && (
                            <div
                              style={{
                                textAlign: s.alignment,
                                fontSize: s.fontSize + 'pt',
                                letterSpacing: s.characterSpacing + 'pt',
                                lineHeight: s.lineHeight + 'em',
                                whiteSpace: 'pre-line',
                                wordBreak: 'break-all',
                                color: s.fontColor || '#000',
                              }}
                            >
                              {/*  Set the letterSpacing of the last character to 0. */}
                              {s.data.split('').map((l, i) => (
                                <span
                                  key={i}
                                  style={{
                                    letterSpacing: String(s.data).length === i + 1 ? 0 : 'inherit',
                                  }}
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                          {s.type === 'image' && (
                            <img
                              alt={s.key}
                              style={{
                                width: s.width * zoom,
                                height: s.height * zoom - 2,
                                borderRadius: 0,
                              }}
                              src={s.data}
                            />
                          )}
                          {barcodeList.includes(s.type) && (
                            <div className={styles.barcodeWrap}>
                              {s.data ? (
                                <>
                                  <p className={styles.example}>Example</p>
                                  <img
                                    alt="barcode"
                                    className={styles.barcodeImg}
                                    src={barcodeExampleImageObj[s.type]}
                                  />
                                </>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </Tippy>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default Main;
