import { useRef, useState, useEffect } from 'react';
import Selecto from 'react-selecto';
import Moveable, { OnDrag, OnResize } from 'react-moveable';
import * as styles from './index.module.scss';
import { GuidesInterface, Schema as SchemaType, PageSize } from '../../libs/type';
import { round, flatten, getFontFamily } from '../../libs/utils';
import { zoom, rulerHeight } from '../../libs/constants';
import Schema from '../../components/Schemas';
import Guides from '../Guides';
import { getSelectoOpt, getMoveableOpt } from './options';
const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => String(round(fmt4Num(prop) / zoom, 2));
interface Props {
  pageCursor: number;
  scale: number;
  backgrounds: string[];
  pageSizes: PageSize[];
  activeElements: HTMLElement[];
  schemas: SchemaType[][];
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  onSelectSchemas: (targets: HTMLElement[]) => void;
  focusElementId: string;
  changeSchemas: (objs: { key: string; value: string; schemaId: string }[]) => void;
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
  changeSchemas,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const verticalGuides = useRef<GuidesInterface[]>([]);
  const horizontalGuides = useRef<GuidesInterface[]>([]);
  const moveable = useRef<any>(null);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.shiftKey) setIsPressShiftKey(true);
  };
  const onKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Shift') setIsPressShiftKey(false);
  };

  const [isPressShiftKey, setIsPressShiftKey] = useState(false);
  const [editing, setEditing] = useState(false);

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
    if (activeElements.length === 0) {
      setEditing(false);
    }
  }, [schemas, activeElements]);

  const onDrag = ({ target, left, top }: OnDrag) => {
    // TODO ドラッグ時にスケールのせいで値がちゃんと設定されない
    // editorのサイズが小さい時にドラッグで思ったように動かない #1434
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
    changeSchemas([
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  const onResizeEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { width, height, top, left } = target.style;
    changeSchemas([
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
    changeSchemas(flatten(arg));
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
    changeSchemas(flatten(arg));
  };

  const getGuideLines = (guides: GuidesInterface[], index: number) =>
    guides[index].getGuides().map((g) => g * zoom + rulerHeight);

  const handleChangeInput = ({ value, schemaId }: { value: string; schemaId: string }) =>
    changeSchemas([{ key: 'data', value, schemaId }]);

  return (
    <div
      ref={wrapRef}
      onClick={() => {
        setEditing(false);
      }}
      style={{ fontFamily: getFontFamily() }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {schemas.map((schema, index) => {
          const pageSize = pageSizes[index];
          if (!pageSize) {
            return null;
          }
          const paperHeight = pageSize.height * zoom;
          const paperWidth = pageSize.width * zoom;
          const paper = { width: paperWidth, height: paperHeight };
          const paperAndRulerWidth = paperWidth + rulerHeight;
          const paperAndRulerHeight = paperHeight + rulerHeight;
          return (
            <div
              key={JSON.stringify(schema)}
              style={{
                margin: `0 auto`,
                position: 'relative',
                background: '#333',
                ...paper,
              }}
            >
              {!editing && (
                <Selecto
                  {...getSelectoOpt()}
                  container={wrapRef.current}
                  continueSelect={isPressShiftKey}
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
              )}

              {pageCursor !== index && (
                <div
                  style={{
                    position: 'absolute',
                    width: paperAndRulerWidth,
                    height: paperAndRulerHeight,
                    zIndex: 100,
                    background: '#9e9e9e94',
                  }}
                />
              )}
              {!editing &&
                pageCursor === index &&
                activeElements.length !== 0 &&
                horizontalGuides.current[index] &&
                verticalGuides.current[index] && (
                  <Moveable
                    {...getMoveableOpt()}
                    ref={moveable}
                    target={activeElements}
                    bounds={{
                      left: 0,
                      top: 0,
                      bottom: paperAndRulerHeight,
                      right: paperAndRulerWidth,
                    }}
                    horizontalGuidelines={getGuideLines(horizontalGuides.current, index)}
                    verticalGuidelines={getGuideLines(verticalGuides.current, index)}
                    keepRatio={isPressShiftKey}
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
                    onClick={() => {
                      setEditing(true);
                      if (inputRef.current) {
                        const ic = inputRef.current;
                        ic.disabled = false;
                        ic.focus();
                        if (ic.type !== 'file') {
                          ic.setSelectionRange(ic.value.length, ic.value.length);
                        }
                      }
                    }}
                  />
                )}
              <Guides
                paper={paper}
                horizontalRef={(e) => {
                  horizontalGuides.current[index] = e!;
                }}
                verticalRef={(e) => {
                  verticalGuides.current[index] = e!;
                }}
              />

              <div
                id={`paper-${index}`}
                style={{
                  position: 'absolute',
                  top: rulerHeight,
                  left: rulerHeight,
                }}
              >
                <img {...paper} src={backgrounds[index] || ''} alt="background" />
                {(schema || []).map((s) => {
                  return (
                    <Schema
                      key={s.id}
                      schema={s}
                      editable={editing && activeElements.map((ae) => ae.id).includes(s.id)}
                      placeholder={''}
                      tabIndex={0}
                      onChange={(value) => handleChangeInput({ value, schemaId: s.id })}
                      onMouseEnter={() => onMouseEnter(s.id)}
                      onMouseLeave={() => onMouseLeave()}
                      onClick={(e) => {
                        e.stopPropagation();
                        editing && onSelectSchemas([]);
                      }}
                      border={focusElementId === s.id ? '1px solid #d42802' : '1px dashed #4af'}
                      ref={inputRef}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Main;
