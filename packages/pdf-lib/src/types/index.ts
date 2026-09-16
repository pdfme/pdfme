import Arc from '../utils/elements/Arc.js';
import Circle from '../utils/elements/Circle.js';
import Ellipse from '../utils/elements/Ellipse.js';
import Line from '../utils/elements/Line.js';
import Plot from '../utils/elements/Plot.js';
import Point from '../utils/elements/Point.js';
import Rectangle from '../utils/elements/Rectangle.js';
import Segment from '../utils/elements/Segment.js';
export type { TransformationMatrix } from './matrix.js';

export type Size = {
  width: number;
  height: number;
};

export type Coordinates = {
  x: number;
  y: number;
};

export type GraphicElement = Arc | Circle | Ellipse | Line | Plot | Point | Rectangle | Segment;

export type Space = {
  topLeft: Coordinates;
  topRight: Coordinates;
  bottomRight: Coordinates;
  bottomLeft: Coordinates;
};

export type LinkElement = Rectangle | Ellipse;
