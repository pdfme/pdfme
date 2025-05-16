import React from 'react';
import { ConfigProvider as ThemeConfigProvider } from 'antd';
import { I18nContext, FontContext, PluginsRegistry, OptionsContext } from '../contexts.js';
import { i18n, getDict } from '../i18n.js';
import { defaultTheme } from '../theme.js';
import type { Dict, Font, Lang, UIOptions, PluginRegistry } from '@pdfme/common';

type Props = {
  children: React.ReactNode;
  lang: Lang;
  font: Font;
  plugins: PluginRegistry;
  options: UIOptions;
};

const isObject = (item: unknown): item is Record<string, unknown> =>
  Boolean(item) && typeof item === 'object' && !Array.isArray(item);

const deepMerge = <T extends Record<string, unknown>, U extends Record<string, unknown>>(
  target: T,
  source: U,
): T & U => {
  let output = { ...target } as T & U;

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      if (isObject(sourceValue)) {
        if (!(key in target)) {
          Object.assign(output, { [key]: sourceValue });
        } else {
          const targetValue = target[key];
          if (isObject(targetValue)) {
            // Using Record<string, unknown> for recursive type
            (output as Record<string, unknown>)[key] = deepMerge(targetValue, sourceValue);
          } else {
            Object.assign(output, { [key]: sourceValue });
          }
        }
      } else {
        Object.assign(output, { [key]: sourceValue });
      }
    });
  }
  return output;
};

const AppContextProvider = ({ children, lang, font, plugins, options }: Props) => {
  let theme = defaultTheme;
  if (options.theme) {
    theme = deepMerge(
      theme as unknown as Record<string, unknown>,
      options.theme as unknown as Record<string, unknown>,
    ) as typeof theme;
  }

  let dict = getDict(lang);
  if (options.labels) {
    dict = deepMerge(
      dict as unknown as Record<string, unknown>,
      options.labels as unknown as Record<string, unknown>,
    ) as typeof dict;
  }

  return (
    <ThemeConfigProvider theme={theme}>
      <I18nContext.Provider value={(key: keyof Dict) => i18n(key, dict)}>
        <FontContext.Provider value={font}>
          <PluginsRegistry.Provider value={plugins}>
            <OptionsContext.Provider value={options}>{children}</OptionsContext.Provider>
          </PluginsRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>
    </ThemeConfigProvider>
  );
};

export default AppContextProvider;
