declare module 'react-moveable' {
  import { ForwardRefExoticComponent, RefAttributes, ReactElement } from 'react';

  export interface OnDrag {
    target: HTMLElement;
    beforeTranslate: [number, number];
    translate: [number, number];
    delta: [number, number];
    dist: [number, number];
    left: number;
    top: number;
    beforeDelta: number;
    beforeDist: number;
    transform: string;
  }

  export interface OnResize {
    target: HTMLElement;
    width: number;
    height: number;
    delta: [number, number];
    dist: [number, number];
    direction: [number, number];
    beforeDirection: [number, number];
    offsetWidth: number;
    offsetHeight: number;
    transform: string;
    translate: [number, number];
  }

  export interface OnRotate {
    target: HTMLElement;
    beforeDelta: number;
    delta: number;
    dist: number;
    rotate: number;
    beforeDist: number;
    beforeRotate: number;
    transform: string;
  }

  export interface MoveableProps {
    target?: HTMLElement[] | HTMLElement | ReactElement | null;
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
    style?: React.CSSProperties;
    className?: string;
    rootContainer?: HTMLElement | null;
    snapCenter?: boolean;
    horizontalGuidelines?: number[];
    verticalGuidelines?: number[];
    elementGuidelines?: HTMLElement[];
    onClick?: (e: any) => void;
    onDragStart?: (e: any) => void;
    onDrag?: (e: any) => void;
    onDragEnd?: (e: any) => void;
    onResizeStart?: (e: any) => void;
    onResize?: (e: any) => void;
    onResizeEnd?: (e: any) => void;
    onRotateStart?: (e: any) => void;
    onRotate?: (e: any) => void;
    onRotateEnd?: (e: any) => void;
    onRotateGroup?: (e: any) => void;
    onDragGroup?: (e: any) => void;
    onResizeGroup?: (e: any) => void;
  }

  export interface MoveableInterface {
    dragStart: (e: MouseEvent) => void;
    isEnabled: () => boolean;
    updateRect: () => void;
  }

  const MoveableComponent: ForwardRefExoticComponent<MoveableProps & RefAttributes<MoveableInterface>>;

  export default MoveableComponent;
}
