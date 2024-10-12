import { Lang } from '@pdfme/common';
import { getPlugin } from './helper';

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

const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" ' +
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
  'class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/>' +
  '<polyline points="12 6 12 12 16 14"/></svg>';

export default getPlugin({ type, defaultFormat, icon, formatsByLang });
