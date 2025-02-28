declare module 'react-moveable' {
  import { ForwardRefExoticComponent, RefAttributes, ReactElement } from 'react';

  export interface OnDrag {
    target: HTMLElement;
    beforeTranslate: [number, number];
    translate: [number, number];
    delta: [number, number];
    dist: [number, number];
  }

  export interface OnResize {
    target: HTMLElement;
    width: number;
    height: number;
    delta: [number, number];
    dist: [number, number];
    direction: [number, number];
    beforeDirection: [number, number];
  }

  export interface OnRotate {
    target: HTMLElement;
    beforeDelta: number;
    delta: number;
    dist: number;
    rotate: number;
  }

  export interface MoveableProps {
    target?: HTMLElement | ReactElement | null;
    container?: HTMLElement | null;
    draggable?: boolean;
    resizable?: boolean;
    scalable?: boolean;
    rotatable?: boolean;
    warpable?: boolean;
    pinchable?: boolean;
    origin?: boolean;
    keepRatio?: boolean;
    throttleDrag?: number;
    throttleResize?: number;
    throttleRotate?: number;
    throttleScale?: number;
    snappable?: boolean;
    bounds?: { left?: number; top?: number; right?: number; bottom?: number };
    onDragStart?: (e: OnDrag) => void;
    onDrag?: (e: OnDrag) => void;
    onDragEnd?: (e: OnDrag) => void;
    onResizeStart?: (e: OnResize) => void;
    onResize?: (e: OnResize) => void;
    onResizeEnd?: (e: OnResize) => void;
    onRotateStart?: (e: OnRotate) => void;
    onRotate?: (e: OnRotate) => void;
    onRotateEnd?: (e: OnRotate) => void;
  }

  export interface MoveableInterface {
    dragStart: (e: MouseEvent) => void;
    isEnabled: () => boolean;
    updateRect: () => void;
  }

  const MoveableComponent: ForwardRefExoticComponent<MoveableProps & RefAttributes<MoveableInterface>>;

  export default MoveableComponent;
}
