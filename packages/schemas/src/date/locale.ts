import { z } from 'zod';

import { AirDatepickerLocale } from 'air-datepicker';

import localeAr from 'air-datepicker/locale/ar';
import localeBg from 'air-datepicker/locale/bg';
import localeCa from 'air-datepicker/locale/ca';
import localeCs from 'air-datepicker/locale/cs';
import localeDa from 'air-datepicker/locale/da';
import localeDe from 'air-datepicker/locale/de';
import localeEl from 'air-datepicker/locale/el';
import localeEn from 'air-datepicker/locale/en';
import localeEs from 'air-datepicker/locale/es';
import localeEu from 'air-datepicker/locale/eu';
import localeFi from 'air-datepicker/locale/fi';
import localeFr from 'air-datepicker/locale/fr';
import localeHr from 'air-datepicker/locale/hr';
import localeHu from 'air-datepicker/locale/hu';
import localeId from 'air-datepicker/locale/id';
import localeIt from 'air-datepicker/locale/it';
import localeJa from 'air-datepicker/locale/ja';
import localeKo from 'air-datepicker/locale/ko';
import localeNb from 'air-datepicker/locale/nb';
import localeNl from 'air-datepicker/locale/nl';
import localeTh from 'air-datepicker/locale/th';
import localePl from 'air-datepicker/locale/pl';
import localePtBR from 'air-datepicker/locale/pt-BR';
import localePt from 'air-datepicker/locale/pt';
import localeRo from 'air-datepicker/locale/ro';
import localeRu from 'air-datepicker/locale/ru';
import localeSi from 'air-datepicker/locale/si';
import localeSk from 'air-datepicker/locale/sk';
import localeSl from 'air-datepicker/locale/sl';
import localeSv from 'air-datepicker/locale/sv';
import localeTr from 'air-datepicker/locale/tr';
import localeUk from 'air-datepicker/locale/uk';
import localeZh from 'air-datepicker/locale/zh';

import * as dateFns from 'date-fns/locale';

export const locales = [
    'ar', 'bg', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'eu', 'fi', 'fr', 'hr', 'hu', 'id', 'it', 'ja',
    'ko', 'nb', 'nl', 'pl', 'pt-Br', 'pt', 'ro', 'ru', 'si', 'sk', 'sl', 'sv', 'th', 'tr', 'uk', 'zh',
] as const;
const localeSchema = z.enum(locales);
export type LocaleEnum = (typeof locales)[number];

export interface Locale {
    adLocale: AirDatepickerLocale,
    close: string,
    formatLocale: dateFns.Locale
}

export const getAirDatepickerLocale = (locale: string): Locale => {
    const parsed = localeSchema.parse(locale);

    switch (parsed) {
        case 'ar': { return { adLocale: localeAr, close: 'يغلق', formatLocale: dateFns.ar } }
        case 'bg': { return { adLocale: localeBg, close: 'близо', formatLocale: dateFns.bg } }
        case 'ca': { return { adLocale: localeCa, close: 'Fermer', formatLocale: dateFns.ca } }
        case 'cs': { return { adLocale: localeCs, close: 'Blízko', formatLocale: dateFns.cs } }
        case 'da': { return { adLocale: localeDa, close: 'Tæt', formatLocale: dateFns.da } }
        case 'de': { return { adLocale: localeDe, close: 'Schließen', formatLocale: dateFns.de } }
        case 'el': { return { adLocale: localeEl, close: 'κοντά', formatLocale: dateFns.el } }
        case 'en': { return { adLocale: localeEn, close: 'Close', formatLocale: dateFns.enUS } }
        case 'es': { return { adLocale: localeEs, close: 'Cerca', formatLocale: dateFns.es } }
        case 'eu': { return { adLocale: localeEu, close: 'Itxi', formatLocale: dateFns.eu } }
        case 'fi': { return { adLocale: localeFi, close: 'Lähellä', formatLocale: dateFns.fi } }
        case 'fr': { return { adLocale: localeFr, close: 'Fermer', formatLocale: dateFns.fr } }
        case 'hr': { return { adLocale: localeHr, close: 'Zatvoriti', formatLocale: dateFns.hr } }
        case 'hu': { return { adLocale: localeHu, close: 'Közeli', formatLocale: dateFns.hu } }
        case 'id': { return { adLocale: localeId, close: 'Menutup', formatLocale: dateFns.id } }
        case 'it': { return { adLocale: localeIt, close: 'Vicino', formatLocale: dateFns.it } }
        case 'ja': { return { adLocale: localeJa, close: '閉じる', formatLocale: dateFns.ja } }
        case 'ko': { return { adLocale: localeKo, close: '닫다', formatLocale: dateFns.ko } }
        case 'nb': { return { adLocale: localeNb, close: 'Lukke', formatLocale: dateFns.nb } }
        case 'nl': { return { adLocale: localeNl, close: 'Dichtbij', formatLocale: dateFns.nl } }
        case 'pl': { return { adLocale: localePl, close: 'Zamknąć', formatLocale: dateFns.pl } }
        case 'pt-Br': { return { adLocale: localePtBR, close: 'Fechar', formatLocale: dateFns.ptBR } }
        case 'pt': { return { adLocale: localePt, close: 'Fechar', formatLocale: dateFns.pt } }
        case 'ro': { return { adLocale: localeRo, close: 'Aproape', formatLocale: dateFns.ro } }
        case 'ru': { return { adLocale: localeRu, close: 'закрывать', formatLocale: dateFns.ru } }
        case 'si': { return { adLocale: localeSi, close: 'සමීපයි', formatLocale: dateFns.enUS } }
        case 'sk': { return { adLocale: localeSk, close: 'Zavrieť', formatLocale: dateFns.sk } }
        case 'sl': { return { adLocale: localeSl, close: 'Blizu', formatLocale: dateFns.sl } }
        case 'sv': { return { adLocale: localeSv, close: 'Nära', formatLocale: dateFns.sv } }
        case 'th': { return { adLocale: localeTh, close: 'ปิด', formatLocale: dateFns.th } }
        case 'tr': { return { adLocale: localeTr, close: 'kapalı', formatLocale: dateFns.tr } }
        case 'uk': { return { adLocale: localeUk, close: 'Close', formatLocale: dateFns.uk } }
        case 'zh': { return { adLocale: localeZh, close: '关闭', formatLocale: dateFns.zhCN } }
        default: {
            throw new Error(`Unsupported locale: ${locale}`);
        }
    }
}
