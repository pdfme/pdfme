import { createContext } from 'react';
import { curriedI18n } from './i18n';
import { getDefaultFont, DEFAULT_LANG } from './constants';

export const I18nContext = createContext(curriedI18n(DEFAULT_LANG));

export const FontContext = createContext(getDefaultFont());
