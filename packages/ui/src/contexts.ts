import { createContext } from 'react';
import { curriedI18n } from './i18n';
import { DEFAULT_LANG } from './constants';
import builtInRenderer from './builtInRenderer';
import { getDefaultFont } from '@pdfme/common';

export const I18nContext = createContext(curriedI18n(DEFAULT_LANG));

export const FontContext = createContext(getDefaultFont());

export const RendererContext = createContext(builtInRenderer);

export const OptionsContext = createContext({});
