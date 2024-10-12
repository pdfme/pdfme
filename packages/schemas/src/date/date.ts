import { Lang } from '@pdfme/common';
import { getPlugin } from './helper';

const type = 'date';

const defaultFormat = 'yyyy/MM/dd';

const formatsByLang: Record<Lang, string[]> = {
  en: [
    defaultFormat,
    'MM/dd/yyyy',
    'MMMM d, yyyy',
    'MMM d, yyyy',
    'EEEE, MMMM d, yyyy',
    'yyyy-MM-dd',
  ],
  zh: [defaultFormat, 'yyyy年MM月dd日', 'MM月dd日', 'M月d日', 'yyyy-MM-dd'],
  ja: [defaultFormat, 'yyyy年MM月dd日', 'MM月dd日', 'M月d日', 'yyyy-MM-dd'],
  ko: [defaultFormat, 'yyyy년 MM월 dd일', 'MM월 dd일', 'M월 d일', 'yyyy-MM-dd'],
  ar: [defaultFormat, 'dd/MM/yyyy', 'd MMMM yyyy', 'd MMM yyyy', 'EEEE، d MMMM yyyy', 'yyyy-MM-dd'],
  th: [
    defaultFormat,
    'dd/MM/yyyy',
    'd MMMM yyyy',
    'd MMM yyyy',
    'EEEEที่ d MMMM G yyyy',
    'yyyy-MM-dd',
  ],
  pl: [defaultFormat, 'dd.MM.yyyy', 'd MMMM yyyy', 'd MMM yyyy', 'EEEE, d MMMM yyyy', 'yyyy-MM-dd'],
  it: [defaultFormat, 'dd/MM/yyyy', 'd MMMM yyyy', 'd MMM yyyy', 'EEEE d MMMM yyyy', 'yyyy-MM-dd'],
  de: [
    defaultFormat,
    'dd.MM.yyyy',
    'd. MMMM yyyy',
    'd. MMM yyyy',
    'EEEE, d. MMMM yyyy',
    'yyyy-MM-dd',
  ],
  es: [
    defaultFormat,
    'dd/MM/yyyy',
    'd de MMMM de yyyy',
    'd de MMM de yyyy',
    'EEEE, d de MMMM de yyyy',
    'yyyy-MM-dd',
  ],
  fr: [defaultFormat, 'dd/MM/yyyy', 'd MMMM yyyy', 'd MMM yyyy', 'EEEE d MMMM yyyy', 'yyyy-MM-dd'],
};

const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" ' +
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
  'class="lucide lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/>' +
  '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>' +
  '</svg>';

export default getPlugin({ type, defaultFormat, icon, formatsByLang });
