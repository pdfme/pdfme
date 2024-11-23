import { Lang } from '@pdfme/common';
import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { Clock } from 'lucide';

const type = 'time';

const defaultFormat = 'HH:mm';

const formatsByLang: Record<Lang, string[]> = {
  en: [defaultFormat, 'hh:mm a', 'HH:mm:ss', 'hh:mm:ss a'],
  zh: [defaultFormat, 'HH时mm分', 'HH:mm:ss'],
  ja: [defaultFormat, 'HH時mm分', 'HH:mm:ss'],
  ko: [defaultFormat, 'a h시 mm분', 'HH:mm:ss'],
  ar: [defaultFormat, 'hh:mm a', 'HH:mm:ss'],
  th: [defaultFormat, 'HH.mm', 'HH:mm:ss'],
  pl: [defaultFormat, 'HH:mm:ss'],
  it: [defaultFormat, 'HH.mm', 'HH:mm:ss'],
  de: [defaultFormat, 'HH.mm', 'HH:mm:ss'],
  es: [defaultFormat, 'hh:mm a', 'HH:mm:ss'],
  fr: [defaultFormat, 'HH:mm:ss'],
};

const icon = createSvgStr(Clock);

export default getPlugin({ type, defaultFormat, icon, formatsByLang });
