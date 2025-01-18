import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { Clock } from 'lucide';

const type = 'time';

const defaultFormat = 'HH:mm';

const icon = createSvgStr(Clock);

export default getPlugin({ type, defaultFormat, icon });
