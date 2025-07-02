import React, { useEffect, forwardRef, Ref, useRef } from 'react';
import MoveableComponent, {
  OnDrag,
  OnRotate,
  OnRotateEnd,
  OnClick,
  OnResize,
} from 'react-moveable';
import { uuid } from '../../../helper.js';
import { theme } from 'antd';

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

const baseClassName = 'pdfme-moveable';

const Moveable = (props: Props, ref: Ref<MoveableComponent>) => {
  const { token } = theme.useToken();
  const instanceId = useRef(uuid());
  const uniqueClassName = `${baseClassName}-${instanceId.current}`;

  useEffect(() => {
    const containerElement = document.querySelector(`.${uniqueClassName}`);
    const moveableLines = document.querySelectorAll(`.${uniqueClassName} .moveable-line`);
    if (containerElement instanceof HTMLElement) {
      containerElement.style.setProperty('--moveable-color', token.colorPrimary);
      moveableLines.forEach((e) => {
        if (e instanceof HTMLElement) {
          e.style.setProperty('--moveable-color', token.colorPrimary);
        }
      });
    }
  }, [props.target, token.colorPrimary, uniqueClassName]);

  return (
    <MoveableComponent
      className={uniqueClassName}
      rootContainer={document ? document.body : undefined}
      snappable
      draggable
      rotatable={props.rotatable}
      resizable
      throttleDrag={1}
      throttleRotate={1}
      throttleResize={1}
      ref={ref}
      target={props.target}
      bounds={props.bounds}
      horizontalGuidelines={props.horizontalGuidelines}
      verticalGuidelines={props.verticalGuidelines}
      keepRatio={props.keepRatio}
      onRotate={props.onRotate}
      onRotateEnd={props.onRotateEnd}
      onRotateGroup={({ events }: { events: OnRotate[] }) => {
        events.forEach(props.onRotate);
      }}
      onRotateGroupEnd={props.onRotateGroupEnd}
      onDrag={props.onDrag}
      onDragGroup={({ events }: { events: OnDrag[] }) => {
        events.forEach(props.onDrag);
      }}
      onDragEnd={props.onDragEnd}
      onDragGroupEnd={props.onDragGroupEnd}
      onResize={props.onResize}
      onResizeGroup={({ events }: { events: OnResize[] }) => {
        events.forEach(props.onResize);
      }}
      onResizeEnd={props.onResizeEnd}
      onResizeGroupEnd={props.onResizeGroupEnd}
      onClick={props.onClick}
    />
  );
};

export default forwardRef<MoveableComponent, Props>(Moveable);
