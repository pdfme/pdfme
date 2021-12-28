import { createContext } from 'react';
import { curriedI18n } from './i18n';
import { defaultFont, defaultLang } from './constants';

export const I18nContext = createContext(curriedI18n(defaultLang));

export const FontContext = createContext(defaultFont);
