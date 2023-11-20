import { createContext } from 'react';
import { getDict } from './i18n';
import { DEFAULT_LANG } from './constants.js';
import { type Dict, getDefaultFont, type Plugins } from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';

export const I18nContext = createContext((key: keyof Dict) => getDict(DEFAULT_LANG)[key]);

export const FontContext = createContext(getDefaultFont());

export const PluginsRegistry = createContext<Plugins>(builtInPlugins);

export const OptionsContext = createContext({});
