import React, { forwardRef, Ref } from 'react';
import Moveable, {
  OnDrag,
  OnDragEnd,
  OnDragGroupEnd,
  OnResize,
  OnResizeEnd,
  OnResizeGroupEnd,
  OnRotate,
  OnRotateEnd,
  OnRotateGroupEnd,
  OnClick,
} from 'react-moveable';

type tgtFunc = ({ target }: { target: HTMLElement | SVGElement }) => void;
type tgtsFunc = ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void;

type Props = {
  target: HTMLElement[];
  bounds: { left: number; top: number; bottom: number; right: number };
  horizontalGuidelines: number[];
  verticalGuidelines: number[];
  keepRatio: boolean;
  onDrag: ((e: OnDrag) => void) & (({ target, left, top }: OnDrag) => void);
  onDragEnd: ((e: OnDragEnd) => void) & tgtFunc;
  onDragGroupEnd: ((e: OnDragGroupEnd) => void) & tgtsFunc;
  onResize: ((e: OnResize) => void) & (({ target, width, height, direction }: OnResize) => void);
  onResizeEnd: ((e: OnResizeEnd) => void) & tgtFunc;
  onResizeGroupEnd: ((e: OnResizeGroupEnd) => void) & tgtsFunc;
  onRotate: ((e: OnRotate) => void) & (({ target, rotate }: OnRotate) => void);
  onRotateEnd: ((e: OnRotateEnd) => void) & tgtFunc;
  onRotateGroupEnd: ((e: OnRotateGroupEnd) => void) & tgtsFunc;

  onClick: (e: OnClick) => void;
};

const _Moveable = (
  {
    target,
    bounds,
    horizontalGuidelines,
    verticalGuidelines,
    keepRatio,
    onDrag,
    onDragEnd,
    onDragGroupEnd,
    onResize,
    onResizeEnd,
    onResizeGroupEnd,
    onRotate,
    onRotateEnd,
    onRotateGroupEnd,
    onClick,
  }: Props,
  ref: Ref<any>
) => (
  <Moveable
    style={{ zIndex: 1 }}
    rootContainer={document ? document.body : undefined}
    snappable
    snapCenter
    draggable
    resizable
    rotatable
    throttleRotate={0}
    rotationPosition="top"
    throttleDrag={1}
    throttleResize={1}
    ref={ref}
    target={target}
    bounds={bounds}
    horizontalGuidelines={horizontalGuidelines}
    verticalGuidelines={verticalGuidelines}
    keepRatio={keepRatio}
    onDrag={onDrag}
    onDragGroup={({ events }) => events.forEach(onDrag)}
    onDragEnd={onDragEnd}
    onDragGroupEnd={onDragGroupEnd}
    onResize={onResize}
    onResizeGroup={({ events }) => events.forEach(onResize)}
    onResizeEnd={onResizeEnd}
    onResizeGroupEnd={onResizeGroupEnd}
    onRotate={onRotate}
    onRotateEnd={onRotateEnd}
    onRotateGroup={({ events }) => events.forEach(onRotate)}
    onRotateGroupEnd={onRotateGroupEnd}
    onClick={onClick}
  />
);

export default forwardRef<any, Props>(_Moveable);
