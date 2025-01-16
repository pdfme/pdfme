import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { CalendarClock } from 'lucide';
import * as Locale from './locale.js';

const type = 'dateTime';

const adLocale = Locale.getAirDatepickerLocale('en').adLocale;
const defaultFormat = `${adLocale.dateFormat} ${adLocale.timeFormat}`;

const icon = createSvgStr(CalendarClock);

export default getPlugin({ type, defaultFormat, icon });
