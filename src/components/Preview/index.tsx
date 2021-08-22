import React, { Component } from 'react';
import Selecto from 'react-selecto';
import Moveable, { OnDrag, OnResize } from 'react-moveable';
import Guides from '@scena/react-guides';
import styles from './index.module.scss';
import { GuidesInterface, Schema, Template, PageSize } from '../../types';
import { round, flatten } from '../../utils';
import { barcodeList, zoom, barcodeExampleImageObj } from '../../constants';

const SELECTABLE = 'selectable';

const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => String(round(fmt4Num(prop) / zoom, 2));

const rulerHeight = 30;

const getFontFamily = () => {
  return 'Helvetica, Arial, sans-serif';
};

interface Props {
  pageCursor: number;
  pages: { size: PageSize; image: string }[];
  activeElements: HTMLElement[];
  template: Template;
  schemas: Schema[][];
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onSelectSchemas: (targets: HTMLElement[]) => void;
  focusElementId: string;
  changeSchema: (
    obj: { key: string; value: string; schemaId: string }[]
  ) => void;
}

interface State {
  scale: number;
  isPressShiftKey: boolean;
}

export default class Preview extends Component<Props, State> {
  private wrapRef: HTMLDivElement | null = null;
  private verticalGuides: GuidesInterface[] = [];
  private horizontalGuides: GuidesInterface[] = [];
  private moveable: any = null;
  private keydown = (e: KeyboardEvent) => {
    if (e.shiftKey) {
      this.setState({ isPressShiftKey: true });
    }
  };
  private keyup = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      this.setState({ isPressShiftKey: false });
    }
  };
  state = {
    scale: 0,
    isPressShiftKey: false,
  };
  componentDidMount() {
    this.setDisplay();
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
  }
  componentDidUpdate(prevProps: Props) {
    if (prevProps.pages !== this.props.pages) {
      this.setDisplay();
    }
    this.moveable && this.moveable.updateRect();
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    window.onresize = () => {};
  }

  async setDisplay() {
    const { pages } = this.props;
    const pageSize = pages[0]?.size;
    if (!pageSize) {
      return;
    }
    const paperWidth = pageSize.width * zoom + rulerHeight;
    const width = typeof window !== 'undefined' ? window.innerWidth : 0;
    this.setState({
      scale: width / paperWidth > 1 ? 1 : width / paperWidth,
    });
    window.onresize = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      this.setState({
        scale: width / paperWidth > 1 ? 1 : width / paperWidth,
      });
      const { pageCursor } = this.props;
      this.moveable && this.moveable.updateRect();
      this.verticalGuides[pageCursor] &&
        this.verticalGuides[pageCursor].resize();
      this.horizontalGuides[pageCursor] &&
        this.horizontalGuides[pageCursor].resize();
    };
  }

  onDrag = ({ target, left, top }: OnDrag) => {
    target!.style.left = (left < 0 ? 0 : left) + 'px';
    target!.style.top = (top < 0 ? 0 : top) + 'px';
  };

  onResize = ({ target, width, height, direction }: OnResize) => {
    const s = target!.style;
    const newLeft =
      Number(fmt4Num(s.left)) + (Number(fmt4Num(s.width)) - width);
    const newTop =
      Number(fmt4Num(s.top)) + (Number(fmt4Num(s.height)) - height);
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

  onDragEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { top, left } = target.style;
    const { changeSchema } = this.props;
    changeSchema([
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  onResizeEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { width, height, top, left } = target.style;
    const { changeSchema } = this.props;
    changeSchema([
      { key: 'width', value: fmt(width), schemaId: target.id },
      { key: 'height', value: fmt(height), schemaId: target.id },
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  onDragEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const { changeSchema } = this.props;
    const arg = targets.map((target) => {
      const { top, left } = target.style;
      return [
        { key: 'position.y', value: fmt(top), schemaId: target.id },
        { key: 'position.x', value: fmt(left), schemaId: target.id },
      ];
    });
    changeSchema(flatten(arg));
  };

  onResizeEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const { changeSchema } = this.props;
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

  render() {
    const {
      pageCursor,
      pages,
      activeElements,
      schemas,
      onSelectSchemas,
      onMouseEnter,
      onMouseLeave,
      focusElementId,
    } = this.props;
    const { scale, isPressShiftKey } = this.state;
    const images = pages.map((p) => p.image);
    const getGuideLines = (guides: GuidesInterface[], index: number) =>
      guides[index].getGuides().map((g) => g * zoom + rulerHeight);
    return (
      <div ref={(node) => (this.wrapRef = node)}>
        {images.map((bgi, index) => {
          const pageSize = pages[index].size;
          if (!pageSize) {
            return null;
          }
          const paperHeight = pageSize.height * zoom;
          const paperWidth = pageSize.width * zoom;
          return (
            <div
              id="edit-area-introduction"
              key={bgi.slice(-10) + index}
              style={{
                width: paperWidth * scale,
                height: paperHeight * scale,
                position: 'relative',
                margin: '0 auto',
                left: (-rulerHeight * scale) / 2,
              }}
            >
              <Selecto
                container={this.wrapRef}
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
                    (this.moveable && this.moveable.isMoveableElement(target))
                  ) {
                    e.stop();
                  }
                }}
                onSelect={(e: any) => {
                  e.stop();
                  onSelectSchemas(e.selected as HTMLElement[]);
                }}
              />

              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
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
                    this.horizontalGuides[index] &&
                    this.verticalGuides[index] && (
                      <Moveable
                        ref={(e: any) => {
                          this.moveable = e;
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
                        horizontalGuidelines={getGuideLines(
                          this.horizontalGuides,
                          index
                        )}
                        verticalGuidelines={getGuideLines(
                          this.verticalGuides,
                          index
                        )}
                        draggable
                        resizable
                        keepRatio={isPressShiftKey}
                        throttleDrag={1}
                        throttleResize={1}
                        onDrag={this.onDrag}
                        onDragGroup={({ events }) => {
                          events.forEach(this.onDrag);
                        }}
                        onDragEnd={this.onDragEnd}
                        onDragGroupEnd={this.onDragEnds}
                        onResize={this.onResize}
                        onResizeGroup={({ events }) => {
                          events.forEach(this.onResize);
                        }}
                        onResizeEnd={this.onResizeEnd}
                        onResizeGroupEnd={this.onResizeEnds}
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
                      this.horizontalGuides[index] = e!;
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
                      this.verticalGuides[index] = e!;
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
                      <img
                        className={styles.paperImage}
                        src={bgi}
                        alt="background"
                      />
                    </div>
                    {schemas[index].map((s) => (
                      <div
                        data-tooltip={
                          s.key.replace(/^{\d+}/, '')
                            ? s.key.replace(/^{\d+}/, '')
                            : null
                        }
                        className={`schema has-tooltip-arrow ${SELECTABLE}`}
                        onMouseEnter={() => onMouseEnter(s.id)}
                        onMouseLeave={() => onMouseLeave()}
                        key={s.id}
                        id={s.id}
                        style={{
                          display: 'block',
                          position: 'absolute',
                          height: +s.height * zoom,
                          width: +s.width * zoom,
                          top: +s.position.y * zoom,
                          left: +s.position.x * zoom,
                          border:
                            focusElementId === s.id
                              ? '1px solid #d42802'
                              : '1px dashed #4af',
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
                                  letterSpacing:
                                    String(s.data).length === i + 1
                                      ? 0
                                      : 'inherit',
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
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}
