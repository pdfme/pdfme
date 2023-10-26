import React from 'react';
import Selecto, { OnDragStart as _OnDragStart, OnSelect as _OnSelect } from 'react-selecto';
import { SELECTABLE_CLASSNAME } from '../../../constants';

const _Selecto = ({
  container,
  continueSelect,
  onDragStart,
  onSelect,
}: {
  container: HTMLElement | null;
  continueSelect: boolean;
  onDragStart: (e: _OnDragStart) => void;
  onSelect: (e: _OnSelect) => void;
}) => (
  <Selecto
    selectFromInside={false}
    selectByClick
    preventDefault
    hitRate={0}
    selectableTargets={[`.${SELECTABLE_CLASSNAME}`]}
    container={container}
    continueSelect={continueSelect}
    onDragStart={onDragStart}
    onSelect={onSelect}
  />
);

export default _Selecto;
