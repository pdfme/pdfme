import { selectableClassName } from '../../libs/constants';

export const getSelectoOpt = () => ({
  selectFromInside: false,
  selectByClick: true,
  preventDefault: true,
  hitRate: 0,
  selectableTargets: [`.${selectableClassName}`],
});

export const getMoveableOpt = () => ({
  style: { zIndex: 1 },
  snappable: true,
  snapCenter: true,
  draggable: true,
  resizable: true,
  throttleDrag: 1,
  throttleResize: 1,
});
