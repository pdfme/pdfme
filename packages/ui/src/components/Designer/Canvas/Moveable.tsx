import React, { useEffect, forwardRef, Ref } from 'react';
import MoveableComponent from 'react-moveable';
import { theme } from 'antd';

// Define the types locally since they're not exported properly
interface OnDrag {
  target: HTMLElement | SVGElement;
  left: number;
  top: number;
  // Add additional properties that might be used in the original library
  beforeDelta: any;
  beforeDist: any;
  beforeTranslate: any;
  delta: any;
  dist: any;
  transform: any;
  translate: any;
}

interface OnResize {
  target: HTMLElement | SVGElement;
  width: number;
  height: number;
  direction: string;
  // Add additional properties that might be used in the original library
  offsetWidth: number;
  offsetHeight: number;
  dist: any;
  delta: any;
  transform: any;
  translate: any;
}

interface OnRotate {
  target: HTMLElement | SVGElement;
  rotate: number;
  // Add additional properties that might be used in the original library
  beforeDist: any;
  beforeDelta: any;
  beforeRotate: any;
  dist: any;
  delta: any;
  transform: any;
}

interface OnRotateEnd {
  target: HTMLElement | SVGElement;
}

interface OnClick {
  inputEvent: MouseEvent;
  // Add additional properties that might be used in the original library
  inputTarget: any;
  isTarget: boolean;
  containsTarget: boolean;
  isDouble: boolean;
  datas: any;
  targets: any[];
  clientX: number;
  clientY: number;
}

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

const className = 'pdfme-moveable';

const _Moveable = (props: Props, ref: Ref<any>) => {
  const { token } = theme.useToken();
  useEffect(() => {
    const containerElement = document.querySelector(`.${className}`) as HTMLElement | null;
    const containerElement2 = document.querySelectorAll(
      `.${className} .moveable-line`,
    ) as NodeListOf<HTMLElement>;
    if (containerElement) {
      containerElement.style.setProperty('--moveable-color', token.colorPrimary);
      Array.from(containerElement2).map((e) =>
        e.style.setProperty('--moveable-color', token.colorPrimary),
      );
    }
  }, [props.target]);

  return (
    // @ts-ignore
    <MoveableComponent
      style={{ zIndex: 1 }}
      className={className}
      rootContainer={document ? document.body : undefined}
      snappable
      snapCenter
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
      onRotateGroup={({ events }: { events: any[] }) => {
        events.forEach(props.onRotate);
      }}
      onRotateGroupEnd={props.onRotateGroupEnd}
      onDrag={props.onDrag}
      onDragGroup={({ events }: { events: any[] }) => {
        events.forEach(props.onDrag);
      }}
      onDragEnd={props.onDragEnd}
      onDragGroupEnd={props.onDragGroupEnd}
      onResize={props.onResize}
      onResizeGroup={({ events }: { events: any[] }) => {
        events.forEach(props.onResize);
      }}
      onResizeEnd={props.onResizeEnd}
      onResizeGroupEnd={props.onResizeGroupEnd}
      onClick={props.onClick}
    />
  );
};

export default forwardRef<any, Props>(_Moveable);
