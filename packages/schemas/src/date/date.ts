import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { Calendar } from 'lucide';

const type = 'date';

const defaultFormat = 'yyyy/MM/dd';

const icon = createSvgStr(Calendar);

export default getPlugin({ type, defaultFormat, icon });
