import { Lang } from '@pdfme/common';
import { getPlugin } from './helper';

const type = 'dateTime';

const defaultFormat = 'yyyy/MM/dd HH:mm';

const formatsByLang: Record<Lang, string[]> = {
  en: [
    defaultFormat,
    'MM/dd/yyyy h:mm a',
    'MMMM d, yyyy h:mm a',
    'MMM d, yyyy h:mm a',
    'EEEE, MMMM d, yyyy h:mm a',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  zh: [
    defaultFormat,
    'yyyy年MM月dd日 HH:mm',
    'MM月dd日 HH:mm',
    'M月d日 HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  ja: [
    defaultFormat,
    'yyyy年MM月dd日 HH:mm',
    'MM月dd日 HH:mm',
    'M月d日 HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  ko: [
    defaultFormat,
    'yyyy-MM-dd HH:mm',
    'yyyy년 MM월 dd일 HH:mm',
    'MM월 dd일 HH:mm',
    'M월 d일 HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  ar: [
    defaultFormat,
    'dd/MM/yyyy h:mm a',
    'd MMMM yyyy h:mm a',
    'd MMM yyyy h:mm a',
    'EEEE، d MMMM yyyy h:mm a',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  th: [
    defaultFormat,
    'dd/MM/yyyy HH:mm',
    'd MMMM yyyy HH:mm',
    'd MMM yyyy HH:mm',
    'EEEEที่ d MMMM G yyyy HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  pl: [
    defaultFormat,
    'dd.MM.yyyy HH:mm',
    'd MMMM yyyy HH:mm',
    'd MMM yyyy HH:mm',
    'EEEE, d MMMM yyyy HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  it: [
    defaultFormat,
    'dd/MM/yyyy HH:mm',
    'd MMMM yyyy HH:mm',
    'd MMM yyyy HH:mm',
    'EEEE d MMMM yyyy HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  de: [
    defaultFormat,
    'dd.MM.yyyy HH:mm',
    'd. MMMM yyyy HH:mm',
    'd. MMM yyyy HH:mm',
    'EEEE, d. MMMM yyyy HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  es: [
    defaultFormat,
    'dd/MM/yyyy h:mm a',
    'd de MMMM de yyyy h:mm a',
    'd de MMM de yyyy h:mm a',
    'EEEE, d de MMMM de yyyy h:mm a',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
  fr: [
    defaultFormat,
    'dd/MM/yyyy HH:mm',
    'd MMMM yyyy HH:mm',
    'd MMM yyyy HH:mm',
    'EEEE d MMMM yyyy HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss",
  ],
};

const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-clock"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>';

export default getPlugin({ type, defaultFormat, icon, formatsByLang });
