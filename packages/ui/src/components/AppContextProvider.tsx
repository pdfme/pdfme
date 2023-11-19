import React from 'react';
import { ConfigProvider as ThemeConfigProvider } from 'antd';
import { I18nContext, FontContext, PluginsRegistry, OptionsContext } from '../contexts';
import { curriedI18n } from '../i18n';
import { defaultTheme } from '../theme';
import type { Plugins, Font, UIOptions } from '@pdfme/common';

type Props = {
  children: React.ReactNode;
  i18n: ReturnType<typeof curriedI18n>;
  font: Font;
  plugins: Plugins;
  options: UIOptions;
};

const isObject = (item: any): item is Record<string, any> =>
  item && typeof item === 'object' && !Array.isArray(item);

const deepMerge = <T extends Record<string, any>, U extends Record<string, any>>(
  target: T,
  source: U
): T & U => {
  let output = { ...target } as T & U;

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key: keyof U) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key as keyof T & U] = deepMerge(target[key as keyof T] as any, source[key] as any);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

export default ({ children, i18n, font, plugins, options }: Props) => {
  let theme = defaultTheme;
  if (options.customTheme) {
    theme = deepMerge(theme, options.customTheme);
  }
  return (
    <ThemeConfigProvider theme={theme}>
      <I18nContext.Provider value={i18n}>
        <FontContext.Provider value={font}>
          <PluginsRegistry.Provider value={plugins}>
            <OptionsContext.Provider value={options}>{children}</OptionsContext.Provider>
          </PluginsRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>
    </ThemeConfigProvider>
  );
};
