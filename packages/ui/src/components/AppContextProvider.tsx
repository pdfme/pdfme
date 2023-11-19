import React from 'react';
import { ConfigProvider as ThemeConfigProvider } from 'antd';
import {
  I18nContext,
  FontContext,
  PluginsRegistry,
  OptionsContext,
  StyleContext,
} from '../contexts';
import { curriedI18n } from '../i18n';
import { theme, style } from '../design';
import type { Plugins, Font } from '@pdfme/common';

type Props = {
  children: React.ReactNode;
  i18n: ReturnType<typeof curriedI18n>;
  font: Font;
  plugins: Plugins;
  options: Object;
};

export default ({ children, i18n, font, plugins, options }: Props) => {
  // TODO themeはoptions.customThemeから上書きできるようにする
  return (
    <ThemeConfigProvider theme={theme}>
      <StyleContext.Provider value={style}>
        <I18nContext.Provider value={i18n}>
          <FontContext.Provider value={font}>
            <PluginsRegistry.Provider value={plugins}>
              <OptionsContext.Provider value={options}>{children}</OptionsContext.Provider>
            </PluginsRegistry.Provider>
          </FontContext.Provider>
        </I18nContext.Provider>
      </StyleContext.Provider>
    </ThemeConfigProvider>
  );
};
