import React, { useEffect } from 'react';
import SelectoComponent from 'react-selecto';
import { SELECTABLE_CLASSNAME } from '../../../constants.js';
import { theme } from 'antd';

// Define the types locally to match what's expected in Canvas/index.tsx
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

type Props = {
  container: HTMLElement | null;
  continueSelect: boolean;
  onDragStart: (e: OnDragStart) => void;
  onSelect: (e: OnSelect) => void;
};

const className = 'pdfme-selecto';

const _Selecto = (props: Props) => {
  const { token } = theme.useToken();
  useEffect(() => {
    const containerElement = document.querySelector('.' + className) as HTMLElement | null;
    if (containerElement) {
      containerElement.style.backgroundColor = token.colorPrimary;
      containerElement.style.opacity = '0.75';
      containerElement.style.borderColor = token.colorPrimaryBorder;
    }
  }, [props.container]);

  return (
    <SelectoComponent
      className={className}
      selectFromInside={false}
      selectByClick
      preventDefault
      hitRate={0}
      selectableTargets={[`.${SELECTABLE_CLASSNAME}`]}
      container={props.container}
      continueSelect={props.continueSelect}
      onDragStart={props.onDragStart}
      onSelect={(e: any) => props.onSelect(e as OnSelect)}
    />
  );
};

export default _Selecto;
