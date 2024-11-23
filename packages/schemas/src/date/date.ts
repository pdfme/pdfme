import { Lang } from '@pdfme/common';
import { getPlugin } from './helper';
import { createSvgStr } from '../utils.js';
import { Calendar } from 'lucide';

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

const icon = createSvgStr(Calendar);

export default getPlugin({ type, defaultFormat, icon, formatsByLang });
