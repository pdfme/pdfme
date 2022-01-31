import { createContext } from 'react';
import { curriedI18n } from './i18n';
import { DEFAULT_LANG } from '../../../common/src/constants';
import { getDefaultFont } from '../../../common/src/helper';

export const I18nContext = createContext(curriedI18n(DEFAULT_LANG));

export const FontContext = createContext(getDefaultFont());
