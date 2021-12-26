import { createContext } from 'react';
import { curriedI18n } from './i18n';
import { defaultFont } from './constants';

export const I18nContext = createContext(curriedI18n('en'));

export const FontContext = createContext(defaultFont);
