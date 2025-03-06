import React, { useEffect } from 'react';
import SelectoComponent, {
  OnSelect as SelectoOnSelect,
  OnDragStart as SelectoOnDragStart,
} from 'react-selecto';
import { SELECTABLE_CLASSNAME } from '../../../constants.js';
import { theme } from 'antd';

type Props = {
  container: HTMLElement | null;
  continueSelect: boolean;
  onDragStart: (e: SelectoOnDragStart) => void;
  onSelect: (e: SelectoOnSelect) => void;
};

const className = 'pdfme-selecto';

const Selecto = (props: Props) => {
  const { token } = theme.useToken();
  useEffect(() => {
    const containerElement = document.querySelector('.' + className);
    if (containerElement instanceof HTMLElement) {
      containerElement.style.backgroundColor = token.colorPrimary;
      containerElement.style.opacity = '0.75';
      containerElement.style.borderColor = token.colorPrimaryBorder;
    }
  }, [props.container, token.colorPrimary, token.colorPrimaryBorder]);

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
      onSelect={props.onSelect}
    />
  );
};

export default Selecto;
