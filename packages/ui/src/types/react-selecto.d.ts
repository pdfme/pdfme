declare module 'react-selecto' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react';

  interface OnDragStart {
    inputEvent: MouseEvent;
    stop: () => void;
    isTrusted: boolean;
  }

  interface OnSelect {
    selected: Element[];
    added: Element[];
    removed: Element[];
    inputEvent: MouseEvent;
    rect: DOMRect;
  }

  interface SelectoProps {
    className?: string;
    selectFromInside?: boolean;
    selectByClick?: boolean;
    preventDefault?: boolean;
    hitRate?: number;
    selectableTargets?: string[];
    container?: HTMLElement | null;
    continueSelect?: boolean;
    onDragStart?: (e: OnDragStart) => void;
    onSelect?: (e: OnSelect) => void;
  }

  // Define the component as a ForwardRefExoticComponent
  const SelectoComponent: ForwardRefExoticComponent<SelectoProps & RefAttributes<HTMLElement>>;

  export default SelectoComponent;
}
