import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { CalendarClock } from 'lucide';

const type = 'dateTime';

const icon = createSvgStr(CalendarClock);

export default getPlugin({ type, icon });
