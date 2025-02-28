declare module 'react-selecto' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface OnDragStart {
    inputEvent: MouseEvent;
    stop: () => void;
    isTrusted: boolean;
  }

  export interface OnSelect {
    selected: Element[];
    added: Element[];
    removed: Element[];
    inputEvent: MouseEvent;
    rect: DOMRect;
  }

  export interface SelectoProps {
    className?: string;
    selectFromInside?: boolean;
    selectByClick?: boolean;
    preventDefault?: boolean;
    hitRate?: number;
    selectableTargets?: string[];
    container?: HTMLElement | null;
    continueSelect?: boolean;
    dragContainer?: HTMLElement | null;
    boundContainer?: HTMLElement | null;
    rootContainer?: HTMLElement | null;
    dragCondition?: (e: MouseEvent) => boolean;
    checkInput?: boolean;
    onDragStart?: (e: OnDragStart) => void;
    onSelect?: (e: OnSelect) => void;
    onSelectEnd?: (e: OnSelect) => void;
  }

  export interface SelectoInterface {
    getSelectedTargets(): Element[];
    setSelectedTargets(targets: Element[], isEnd?: boolean): this;
    clickTarget(target: Element, isEnd?: boolean): this;
    select(): this;
    selectAll(): this;
    setEnabled(enabled: boolean): this;
    getEnabled(): boolean;
    destroy(): void;
  }

  // Define the component as a ForwardRefExoticComponent with proper interface
  const SelectoComponent: ForwardRefExoticComponent<SelectoProps & RefAttributes<SelectoInterface>>;

  export default SelectoComponent;
}
