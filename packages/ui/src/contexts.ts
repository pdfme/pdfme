import { createContext } from 'react';
import { i18n } from './i18n.js';
import { getDefaultFont, PluginRegistry, pluginRegistry, UIOptions } from '@pdfme/common';
import { builtInPlugins } from '@pdfme/schemas';

export const I18nContext = createContext(i18n);

export const FontContext = createContext(getDefaultFont());

export const PluginsRegistry = createContext<PluginRegistry>(pluginRegistry(builtInPlugins));

export const OptionsContext = createContext<UIOptions>({});

export const CacheContext = createContext<Map<string | number, unknown>>(new Map());
