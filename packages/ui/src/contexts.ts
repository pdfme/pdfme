import { createContext } from 'react';
import { curriedI18n } from './i18n';
import { DEFAULT_LANG } from './constants';
import { getDefaultFont, Plugins } from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';

export const I18nContext = createContext(curriedI18n(DEFAULT_LANG));

export const FontContext = createContext(getDefaultFont());

export const PluginsRegistry = createContext<Plugins>(builtInPlugins);

export const OptionsContext = createContext({});
