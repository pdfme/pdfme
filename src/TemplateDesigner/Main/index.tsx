import { MutableRefObject, useRef, useState, useEffect } from 'react';
import { OnDrag, OnResize } from 'react-moveable';
import * as styles from './index.module.scss';
import { GuidesInterface, Schema as SchemaType, PageSize } from '../../libs/type';
import { round, flatten } from '../../libs/utils';
import { zoom, rulerHeight } from '../../libs/constants';
import Paper from '../../components/Paper';
import Schema from '../../components/Schemas';
import Selecto from './Selecto';
import Moveable from './Moveable';
import Guides from './Guides';

const fmt4Num = (prop: string) => Number(prop.replace('px', ''));
const fmt = (prop: string) => String(round(fmt4Num(prop) / zoom, 2));

const Mask = ({ width, height }: PageSize) => (
  <div className={styles.mask} style={{ width, height }} />
);
interface Props {
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

const Main = ({
  pageCursor,
  scale,
  backgrounds,
  pageSizes,
  activeElements,
  schemas,
  setActiveElements,
  changeSchemas,
  paperRefs,
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
    moveable.current?.updateRect();
  }, [schemas]);

  const onDrag = ({ target, left, top }: OnDrag) => {
    target.style.left = (left < 0 ? 0 : left) + 'px';
    target.style.top = (top < 0 ? 0 : top) + 'px';
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
      ref={wrapRef}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(false);
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Selecto
        container={wrapRef.current}
        continueSelect={isPressShiftKey}
        onDragStart={(e) => {
          if (
            (e.inputEvent.type === 'touchstart' && e.isTrusted) ||
            moveable.current?.isMoveableElement(e.inputEvent.target)
          ) {
            e.stop();
          }
        }}
        onSelect={(e: any) => {
          e.stop();
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
          const ps = paperSize;
          const rh = rulerHeight;
          return (
            <>
              <Guides
                paperSize={ps}
                horizontalRef={(e) => e && (horizontalGuides.current[index] = e)}
                verticalRef={(e) => e && (verticalGuides.current[index] = e)}
              />
              {pageCursor !== index ? (
                <Mask {...ps} />
              ) : (
                !editing && (
                  <Moveable
                    ref={moveable}
                    target={activeElements}
                    bounds={{ left: 0, top: 0, bottom: ps.height + rh, right: ps.width + rh }}
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
export default Main;
