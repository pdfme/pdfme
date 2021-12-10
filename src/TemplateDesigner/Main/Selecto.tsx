import React from 'react';
import Selecto, { OnDragStart as _OnDragStart, OnSelect as _OnSelect } from 'react-selecto';
import { selectableClassName } from '../../libs/constants';

const _Selecto = ({
  container,
  continueSelect,
  onDragStart,
  onSelect,
}: {
  container: HTMLElement | null;
  continueSelect: boolean;
  onDragStart: (e: _OnDragStart) => any;
  onSelect: (e: _OnSelect) => any;
}) => (
  <Selecto
    selectFromInside={false}
    selectByClick={true}
    preventDefault={true}
    hitRate={0}
    selectableTargets={[`.${selectableClassName}`]}
    container={container}
    continueSelect={continueSelect}
    onDragStart={onDragStart}
    onSelect={onSelect}
  />
);

export default _Selecto;
