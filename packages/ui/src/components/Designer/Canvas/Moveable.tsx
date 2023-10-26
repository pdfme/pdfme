import React, { forwardRef, Ref } from 'react';
import Moveable, { OnDrag, OnResize, OnRotate, OnRotateEnd, OnClick } from 'react-moveable';

type Props = {
  target: HTMLElement[];
  bounds: { left: number; top: number; bottom: number; right: number };
  horizontalGuidelines: number[];
  verticalGuidelines: number[];
  keepRatio: boolean;
  rotatable: boolean;
  onDrag: ({ target, left, top }: OnDrag) => void;
  onDragEnd: ({ target }: { target: HTMLElement | SVGElement }) => void;
  onDragGroupEnd: ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void;
  onRotate: ({ target, rotate }: OnRotate) => void;
  onRotateEnd: ({ target }: OnRotateEnd) => void;
  onRotateGroupEnd: ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void;
  onResize: ({ target, width, height, direction }: OnResize) => void;
  onResizeEnd: ({ target }: { target: HTMLElement | SVGElement }) => void;
  onResizeGroupEnd: ({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void;
  onClick: (e: OnClick) => void;
};

const _Moveable = (
  {
    target,
    bounds,
    horizontalGuidelines,
    verticalGuidelines,
    keepRatio,
    rotatable,
    onDrag,
    onDragEnd,
    onDragGroupEnd,
    onRotate,
    onRotateEnd,
    onRotateGroupEnd,
    onResize,
    onResizeEnd,
    onResizeGroupEnd,
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
    rotatable={rotatable}
    resizable
    throttleDrag={1}
    throttleRotate={1}
    throttleResize={1}
    ref={ref}
    target={target}
    bounds={bounds}
    horizontalGuidelines={horizontalGuidelines}
    verticalGuidelines={verticalGuidelines}
    keepRatio={keepRatio}
    onRotate={onRotate}
    onRotateEnd={onRotateEnd}
    onRotateGroup={({ events }) => {
      events.forEach(onRotate);
    }}
    onRotateGroupEnd={onRotateGroupEnd}
    onDrag={onDrag}
    onDragGroup={({ events }) => {
      events.forEach(onDrag);
    }}
    onDragEnd={onDragEnd}
    onDragGroupEnd={onDragGroupEnd}
    onResize={onResize}
    onResizeGroup={({ events }) => {
      events.forEach(onResize);
    }}
    onResizeEnd={onResizeEnd}
    onResizeGroupEnd={onResizeGroupEnd}
    onClick={onClick}
  />
);

export default forwardRef<any, Props>(_Moveable);
