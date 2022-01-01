import React, {
  Ref,
  MutableRefObject,
  useRef,
  useState,
  useEffect,
  forwardRef,
  useCallback,
} from 'react';
import { OnDrag, OnResize } from 'react-moveable';
import { Schema as SchemaType, PageSize } from '../../../libs/type';
import { round, flatten } from '../../../libs/utils';
import { zoom, rulerHeight } from '../../../libs/constants';
import Paper from '../../Paper';
import Schema from '../../Schemas';
import Selecto from './Selecto';
import Moveable from './Moveable';
import Guides from './Guides';
import Mask from './Mask';

const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => String(round(fmt4Num(prop) / zoom, 2));
const isTopLeftResize = (d: string) => d === '-1,-1' || d === '-1,0' || d === '0,-1';

interface GuidesInterface {
  getGuides(): number[];
  scroll(pos: number): void;
  scrollGuides(pos: number): void;
  loadGuides(guides: number[]): void;
  resize(): void;
}

interface Props {
  height: number;
  pageCursor: number;
  scale: number;
  backgrounds: string[];
  pageSizes: PageSize[];
  activeElements: HTMLElement[];
  schemas: { [key: string]: SchemaType }[];
  setActiveElements: (targets: HTMLElement[]) => void;
  changeSchemas: (objs: { key: string; value: string; schemaId: string }[]) => void;
  paperRefs: MutableRefObject<HTMLDivElement[]>;
}

const Main = (props: Props, ref: Ref<HTMLDivElement>) => {
  const {
    pageCursor,
    scale,
    backgrounds,
    pageSizes,
    activeElements,
    schemas,
    setActiveElements,
    changeSchemas,
    paperRefs,
  } = props;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const verticalGuides = useRef<GuidesInterface[]>([]);
  const horizontalGuides = useRef<GuidesInterface[]>([]);
  const moveable = useRef<any>(null);

  const [isPressShiftKey, setIsPressShiftKey] = useState(false);
  const [editing, setEditing] = useState(false);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.shiftKey) setIsPressShiftKey(true);
  };
  const onKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Shift') setIsPressShiftKey(false);
  };

  const initEvents = useCallback(() => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('keyup', onKeyup);
  }, []);

  const destroyEvents = useCallback(() => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
  }, []);

  useEffect(() => {
    initEvents();

    return destroyEvents;
  }, [initEvents, destroyEvents]);

  useEffect(() => {
    moveable.current?.updateRect();
  }, [schemas]);

  const onDrag = ({ target, left, top }: OnDrag) => {
    target.style.left = `${left < 0 ? 0 : left}px`;
    target.style.top = `${top < 0 ? 0 : top}px`;
  };

  const onDragEnd = ({ target }: { target: HTMLElement | SVGElement }) => {
    const { top, left } = target.style;
    changeSchemas([
      { key: 'position.y', value: fmt(top), schemaId: target.id },
      { key: 'position.x', value: fmt(left), schemaId: target.id },
    ]);
  };

  const onDragEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map((target) => [
      { key: 'position.y', value: fmt(target.style.top), schemaId: target.id },
      { key: 'position.x', value: fmt(target.style.left), schemaId: target.id },
    ]);
    changeSchemas(flatten(arg));
  };

  const onResize = ({ target, width, height, direction }: OnResize) => {
    if (!target) return;
    const s = target.style;
    const newLeft = fmt4Num(s.left) + (fmt4Num(s.width) - width);
    const newTop = fmt4Num(s.top) + (fmt4Num(s.height) - height);
    const obj: { top?: string; left?: string; width: string; height: string } = {
      width: `${width}px`,
      height: `${height}px`,
    };
    const d = direction.toString();
    if (isTopLeftResize(d)) {
      obj.top = `${newTop}px`;
      obj.left = `${newLeft}px`;
    } else if (d === '1,-1') {
      obj.top = `${newTop}px`;
    } else if (d === '-1,1') {
      obj.left = `${newLeft}px`;
    }
    Object.assign(s, obj);
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

  const onResizeEnds = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => {
    const arg = targets.map((target) => [
      { key: 'width', value: fmt(target.style.width), schemaId: target.id },
      { key: 'height', value: fmt(target.style.height), schemaId: target.id },
      { key: 'position.y', value: fmt(target.style.top), schemaId: target.id },
      { key: 'position.x', value: fmt(target.style.left), schemaId: target.id },
    ]);
    changeSchemas(flatten(arg));
  };

  const getGuideLines = (guides: GuidesInterface[], index: number) =>
    guides[index] && guides[index].getGuides().map((g) => g * zoom);

  const onClickMoveable = () => {
    setEditing(true);
    const ic = inputRef.current;
    if (!ic) return;
    ic.disabled = false;
    ic.focus();
    if (ic.type !== 'file') {
      ic.setSelectionRange(ic.value.length, ic.value.length);
    } else {
      ic.click();
    }
  };

  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(false);
      }}
      style={{ height: props.height }}
    >
      <Selecto
        container={null}
        continueSelect={isPressShiftKey}
        onDragStart={(e) => {
          if (
            (e.inputEvent.type === 'touchstart' && e.isTrusted) ||
            moveable.current?.isMoveableElement(e.inputEvent.target)
          ) {
            e.stop();
          }
        }}
        onSelect={(e) => {
          setActiveElements(e.selected as HTMLElement[]);
        }}
      />
      <Paper
        paperRefs={paperRefs}
        scale={scale}
        schemas={schemas}
        pageSizes={pageSizes}
        backgrounds={backgrounds}
        render={({ index, schema, paperSize }) => {
          return (
            <>
              <Guides
                paperSize={paperSize}
                horizontalRef={(e) => {
                  if (e) {
                    horizontalGuides.current[index] = e;
                  }
                }}
                verticalRef={(e) => {
                  if (e) {
                    verticalGuides.current[index] = e;
                  }
                }}
              />
              {pageCursor !== index ? (
                <Mask
                  width={paperSize.width + rulerHeight}
                  height={paperSize.height + rulerHeight}
                />
              ) : (
                !editing && (
                  <Moveable
                    ref={moveable}
                    target={activeElements}
                    bounds={{ left: 0, top: 0, bottom: paperSize.height, right: paperSize.width }}
                    horizontalGuidelines={getGuideLines(horizontalGuides.current, index)}
                    verticalGuidelines={getGuideLines(verticalGuides.current, index)}
                    keepRatio={isPressShiftKey}
                    onDrag={onDrag}
                    onDragEnd={onDragEnd}
                    onDragGroupEnd={onDragEnds}
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                    onResizeGroupEnd={onResizeEnds}
                    onClick={onClickMoveable}
                  />
                )
              )}
              {Object.entries(schema).map((entry) => {
                const [key, s] = entry as [string, SchemaType];

                return (
                  <Schema
                    key={key}
                    schema={s}
                    editable={editing && activeElements.map((ae) => ae.id).includes(s.id)}
                    placeholder={''}
                    tabIndex={0}
                    onChange={(value) => changeSchemas([{ key: 'data', value, schemaId: s.id }])}
                    border={'1px dashed #4af'}
                    ref={inputRef}
                  />
                );
              })}
            </>
          );
        }}
      />
    </div>
  );
};
export default forwardRef<HTMLDivElement, Props>(Main);
