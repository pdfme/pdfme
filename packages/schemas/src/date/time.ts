import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { Clock } from 'lucide';
import * as Locale from './locale.js';

const type = 'time';

// const defaultFormat = Locale.getAirDatepickerLocale('en').adLocale.timeFormat;
const defaultFormat = 'HH:mm';

const icon = createSvgStr(Clock);

export default getPlugin({ type, defaultFormat, icon });
