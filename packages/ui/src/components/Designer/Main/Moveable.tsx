import React, { forwardRef, Ref } from 'react';
import Moveable, {
  OnDrag,
  OnResize,
  OnDragEnd,
  OnDragGroupEnd,
  OnResizeEnd,
  OnResizeGroupEnd,
  OnClick,
} from 'react-moveable';

type Props = {
  target: HTMLElement[];
  bounds: { left: number; top: number; bottom: number; right: number };
  horizontalGuidelines: number[];
  verticalGuidelines: number[];
  keepRatio: boolean;
  onDrag: ((e: OnDrag) => void) & (({ target, left, top }: OnDrag) => void);
  onDragEnd: ((e: OnDragEnd) => void) &
    (({ target }: { target: HTMLElement | SVGElement }) => void);
  onDragGroupEnd: ((e: OnDragGroupEnd) => void) &
    (({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void);
  onResize: ((e: OnResize) => void) & (({ target, width, height, direction }: OnResize) => void);
  onResizeEnd: ((e: OnResizeEnd) => void) &
    (({ target }: { target: HTMLElement | SVGElement }) => void);
  onResizeGroupEnd: ((e: OnResizeGroupEnd) => void) &
    (({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void);
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
    throttleDrag={1}
    throttleResize={1}
    ref={ref}
    target={target}
    bounds={bounds}
    horizontalGuidelines={horizontalGuidelines}
    verticalGuidelines={verticalGuidelines}
    keepRatio={keepRatio}
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
