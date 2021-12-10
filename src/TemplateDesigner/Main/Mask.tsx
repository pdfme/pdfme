import { rulerHeight } from '../../libs/constants';
import { PageSize } from '../../libs/type';

const Mask = ({ width, height, scale }: PageSize & { scale: number }) => (
  <div
    style={{
      position: 'absolute',
      top: -rulerHeight,
      left: -rulerHeight,
      zIndex: 100,
      background: 'rgba(158, 158, 158, 0.58)',
      width,
      height: height - (rulerHeight * scale) / 2,
    }}
  />
);

export default Mask;
