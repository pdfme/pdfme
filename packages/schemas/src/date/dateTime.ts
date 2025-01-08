import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { CalendarClock } from 'lucide';

const type = 'dateTime';

const defaultFormat = 'yyyy/MM/dd HH:mm';

const icon = createSvgStr(CalendarClock);

export default getPlugin({ type, defaultFormat, icon });
