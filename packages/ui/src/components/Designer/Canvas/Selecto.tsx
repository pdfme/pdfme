import React, { useEffect } from 'react';
import Selecto, { OnDragStart as _OnDragStart, OnSelect as _OnSelect } from 'react-selecto';
import { SELECTABLE_CLASSNAME } from '../../../constants';
import { theme } from 'antd';

type Props = {
  container: HTMLElement | null;
  continueSelect: boolean;
  onDragStart: (e: _OnDragStart) => void;
  onSelect: (e: _OnSelect) => void;
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
    <Selecto
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

export default _Selecto;
