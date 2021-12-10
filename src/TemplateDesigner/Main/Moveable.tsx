import React, { forwardRef } from 'react';
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
  onDrag: ((e: OnDrag) => any) & (({ target, left, top }: OnDrag) => void);
  onDragEnd: ((e: OnDragEnd) => any) & (({ target }: { target: HTMLElement | SVGElement }) => void);
  onDragGroupEnd: ((e: OnDragGroupEnd) => any) &
    (({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void);
  onResize: ((e: OnResize) => any) & (({ target, width, height, direction }: OnResize) => void);
  onResizeEnd: ((e: OnResizeEnd) => any) &
    (({ target }: { target: HTMLElement | SVGElement }) => void);
  onResizeGroupEnd: ((e: OnResizeGroupEnd) => any) &
    (({ targets }: { targets: (HTMLElement | SVGElement)[] }) => void);
  onClick: ((e: OnClick) => any) & (() => void);
};

const _Moveable = forwardRef<any, Props>(
  (
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
    },
    ref
  ) => (
    <Moveable
      style={{ zIndex: 1 }}
      snappable={true}
      snapCenter={true}
      draggable={true}
      resizable={true}
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
  )
);

export default _Moveable;
