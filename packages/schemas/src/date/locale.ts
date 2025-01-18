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

export interface Locale {
    label: string,
    adLocale: AirDatepickerLocale,
    close: string,
    formatLocale: dateFns.Locale
}

export const getAirDatepickerLocale = (locale: string): Locale => {
    switch (locale) {
        case 'ar': { return {label: 'Arabic', adLocale: localeAr, close: 'يغلق', formatLocale: dateFns.ar } }
        case 'bg': { return {label: 'Bulgarian', adLocale: localeBg, close: 'близо', formatLocale: dateFns.bg } }
        case 'ca': { return {label: 'Catalan', adLocale: localeCa, close: 'Fermer', formatLocale: dateFns.ca } }
        case 'cs': { return {label: 'Czech', adLocale: localeCs, close: 'Blízko', formatLocale: dateFns.cs } }
        case 'da': { return {label: 'Danish', adLocale: localeDa, close: 'Tæt', formatLocale: dateFns.da } }
        case 'de': { return {label: 'German', adLocale: localeDe, close: 'Schließen', formatLocale: dateFns.de } }
        case 'el': { return {label: 'Greek', adLocale: localeEl, close: 'κοντά', formatLocale: dateFns.el } }
        case 'en': { return {label: 'English', adLocale: localeEn, close: 'Close', formatLocale: dateFns.enUS } }
        case 'es': { return {label: 'Spanish', adLocale: localeEs, close: 'Cerca', formatLocale: dateFns.es } }
        case 'eu': { return {label: 'Basque', adLocale: localeEu, close: 'Itxi', formatLocale: dateFns.eu } }
        case 'fi': { return {label: 'Finnish', adLocale: localeFi, close: 'Lähellä', formatLocale: dateFns.fi } }
        case 'fr': { return {label: 'French', adLocale: localeFr, close: 'Fermer', formatLocale: dateFns.fr } }
        case 'hr': { return {label: 'Croatian', adLocale: localeHr, close: 'Zatvoriti', formatLocale: dateFns.hr } }
        case 'hu': { return {label: 'Hungarian', adLocale: localeHu, close: 'Közeli', formatLocale: dateFns.hu } }
        case 'id': { return {label: 'Indonesian', adLocale: localeId, close: 'Menutup', formatLocale: dateFns.id } }
        case 'it': { return {label: 'Italian', adLocale: localeIt, close: 'Vicino', formatLocale: dateFns.it } }
        case 'ja': { return {label: 'Japanese', adLocale: localeJa, close: '閉じる', formatLocale: dateFns.ja } }
        case 'ko': { return {label: 'Korean', adLocale: localeKo, close: '닫다', formatLocale: dateFns.ko } }
        case 'nb': { return {label: 'Norwegian Bokmål', adLocale: localeNb, close: 'Lukke', formatLocale: dateFns.nb } }
        case 'nl': { return {label: 'Dutch', adLocale: localeNl, close: 'Dichtbij', formatLocale: dateFns.nl } }
        case 'pl': { return {label: 'Polish', adLocale: localePl, close: 'Zamknąć', formatLocale: dateFns.pl } }
        case 'pt-Br': { return {label: 'Portuguese', adLocale: localePtBR, close: 'Fechar', formatLocale: dateFns.ptBR } }
        case 'pt': { return {label: 'Portuguese', adLocale: localePt, close: 'Fechar', formatLocale: dateFns.pt } }
        case 'ro': { return {label: 'Romanian', adLocale: localeRo, close: 'Aproape', formatLocale: dateFns.ro } }
        case 'ru': { return {label: 'Russian', adLocale: localeRu, close: 'закрывать', formatLocale: dateFns.ru } }
        // Using enUS for Sinhala since it is not supported in dateFns atm.
        case 'si': { return {label: 'Sinhala', adLocale: localeSi, close: 'සමීපයි', formatLocale: dateFns.enUS } }
        case 'sk': { return {label: 'Slovak', adLocale: localeSk, close: 'Zavrieť', formatLocale: dateFns.sk } }
        case 'sl': { return {label: 'Slovenian', adLocale: localeSl, close: 'Blizu', formatLocale: dateFns.sl } }
        case 'sv': { return {label: 'Swedish', adLocale: localeSv, close: 'Nära', formatLocale: dateFns.sv } }
        case 'th': { return {label: 'Thai', adLocale: localeTh, close: 'ปิด', formatLocale: dateFns.th } }
        case 'tr': { return {label: 'Turkish', adLocale: localeTr, close: 'kapalı', formatLocale: dateFns.tr } }
        case 'uk': { return {label: 'Ukrainian', adLocale: localeUk, close: 'Закрити', formatLocale: dateFns.uk } }
        case 'zh': { return {label: 'Chinese', adLocale: localeZh, close: '关闭', formatLocale: dateFns.zhCN } }
        default: {
            throw new Error(`Unsupported locale: ${locale}`);
        }
    }
}
