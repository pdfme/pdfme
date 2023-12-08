import { PropPanel } from '@pdfme/common';
import type { ImageSchema } from './types';
import { DEFAULT_OPACITY } from '../constants.js';

export const propPanel: PropPanel<ImageSchema> = {
  schema: {},
  defaultValue:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAu4AAALuAQMAAADL0wGJAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAGUExURbzAw+rv8fKruy0AAAPoSURBVHja7dwxbtwwEEBRCkKwRQodYftcYk+ROkcJz5NTsEuZK/AIKlIQAUEnke0VqQ0pA5zxWvFnZcD2s0CNuENxPOZBc0QDDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PD/+P8bkxvnTzzjTG0M2b5rh08rHNT518aPOnTt63+aGTd23edPJ2h//ax+/oO6Gzx6c78+cuPu7x01vmwx5/6uLnO/PjO+b/rGifvtWH3VnT9vmh/e3eqx/bc9d79af2YwEPDw8P/6r8r1GVt5VcUoZPtXxGhp9rGYEM72vbEBne1hJ5Gb6ayIvwqZppi/CxmgqL8KGaTIrwc3WDfATeV/ffIryr7r+PwNvq/vsIfH17D5/qbw/gb/mLKp/OqnycFPj14yqcJPm4vfp5VJ0cP6jyzqjy9rr2q/Dr4qzBp3V5E1wxp/V3rl8LXn32qF6fAY31Psv2NXi/5lQaH+Vuzak0eLsmPRppVPa3FPiU3QiFFDZmD4FCAh6yxV+Bn7O9isLmx2d/TGHr5rI7obDxtFkcKWyb89M2+U1/sX7Kv7Io8gaxFy5l2D/faRk++3x6PgsalV52+fwUW4j/+eGhDPuneyH/otHmp9jyfHHMLM6n4phZnI/FObA4H4qDWnF+Lo46xXlflG+I864o3xDnbVG+Ic6X9RXSfCrrK6T5WBZASPOhrFCQ5ufyjF+a92XdkjTvyrolad6WdUvS/KawSI7/sQn7JfDl+O+bsF8CX44fN2FvHnNnIT4Nm7BfAl+ON5uwXwJfjA/LCuk2BXvCvN0U7InxflmAtxV1gvx0U2N3luPtdZOlwj/FoR5vbuq85Pi48F6LD0scOk3+sq1cleP9ohlNfkpq/N9pGaMuH7T4ZVqGWYt/nBavyxstftblfaVIWJU/y72yODCfzJH5oMvPh+adLm+PzCdzZD5U/61ClT9Lnvyo8e7QvFHlE3ydj0zOu5ucickhcpgcJofJedUVk8j5b/nGgIeHh4d/I3x/RwLlhgfNH3DavSwGXf7YjT76uqCEQ/P37p9z7uKVmwspd17S7hul3PXK6fbsmnvWhO6GZlMnn3ri8gXN5GzHnX0B35ydj91814CHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHl+d/A9cKjmiL040TAAAAAElFTkSuQmCC',
  defaultSchema: {
    type: 'image',
    position: { x: 0, y: 0 },
    width: 40,
    height: 40,
    // If the value of "rotate" is set to undefined or not set at all, rotation will be disabled in the UI.
    // Check this document: https://pdfme.com//docs/custom-schemas#learning-how-to-create-from-pdfmeschemas-code
    rotate: 0,
    opacity: DEFAULT_OPACITY,
  },
};
