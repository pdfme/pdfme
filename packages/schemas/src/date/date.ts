import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { Calendar } from 'lucide';
import * as Locale from './locale.js';

const type = 'date';

const defaultFormat = Locale.getAirDatepickerLocale('en').adLocale.dateFormat;

const icon = createSvgStr(Calendar);

export default getPlugin({ type, defaultFormat, icon });
