import { getPlugin } from './helper.js';
import { createSvgStr } from '../utils.js';
import { Calendar } from 'lucide';

const type = 'date';

const icon = createSvgStr(Calendar);

export default getPlugin({ type, icon });
