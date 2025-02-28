import { getPlugin } from './helper.js';
import { createSvgStr } from '../utils.js';
import { Clock } from 'lucide';

const type = 'time';

const icon = createSvgStr(Clock);

export default getPlugin({ type, icon });
