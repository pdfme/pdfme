import React from 'react';
import ReactDOM from 'react-dom';
import { ConfigProvider, ThemeConfig } from 'antd';
import { Template, DesignerProps, checkDesignerProps, checkTemplate } from '@pdfme/common';
import type { PropPanelObject } from './types';
import { BaseUIClass } from './class';
import { DESTROYED_ERR_MSG } from './constants';
import {
  I18nContext,
  FontContext,
  RendererRegistry,
  PropPanelRegistry,
  OptionsContext,
} from './contexts';
import DesignerComponent from './components/Designer/index';
import { cloneDeep } from './helper';
import builtInPropPanel from './builtInPropPanel';

// TODO Custom Design for UI #243
// - https://github.com/pdfme/pdfme/issues/243
// - https://ant.design/docs/react/customize-theme
const theme: ThemeConfig = {
  token: {
    fontSize: 12,
  },
  components: {
    Form: {
      itemMarginBottom: 8,
      verticalLabelPadding: '0 0 2px',
    },
  },
};

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (template: Template) => void;
  private onChangeTemplateCallback?: (template: Template) => void;

  private propPanelRegistry: PropPanelObject = builtInPropPanel;

  constructor(props: DesignerProps) {
    super(props);
    checkDesignerProps(props);

    const { plugins = {} } = props;

    const customPropPanel = Object.entries(plugins).reduce(
      (acc, [key, { propPanel }]) => Object.assign(acc, { [key]: propPanel }),
      {} as PropPanelObject
    );
    if (Object.keys(customPropPanel).length > 0) {
      this.propPanelRegistry = customPropPanel
    }

    this.render();
  }

  public saveTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    if (this.onSaveTemplateCallback) {
      this.onSaveTemplateCallback(this.template);
    }
  }

  public updateTemplate(template: Template) {
    checkTemplate(template);
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.template = cloneDeep(template);
    if (this.onChangeTemplateCallback) {
      this.onChangeTemplateCallback(template);
    }
    this.render();
  }

  public onSaveTemplate(cb: (template: Template) => void) {
    this.onSaveTemplateCallback = cb;
  }

  public onChangeTemplate(cb: (template: Template) => void) {
    this.onChangeTemplateCallback = cb;
  }

  protected getPropPanelRegistry() {
    return this.propPanelRegistry;
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    ReactDOM.render(
      <ConfigProvider theme={theme}>
        <I18nContext.Provider value={this.getI18n()}>
          <FontContext.Provider value={this.getFont()}>
            <RendererRegistry.Provider value={this.getRendererRegistry()}>
              <PropPanelRegistry.Provider value={this.getPropPanelRegistry()}>
                <OptionsContext.Provider value={this.getOptions()}>
                  <DesignerComponent
                    template={this.template}
                    onSaveTemplate={(template) => {
                      this.template = template;
                      if (this.onSaveTemplateCallback) {
                        this.onSaveTemplateCallback(template);
                      }
                    }}
                    onChangeTemplate={(template) => {
                      this.template = template;
                      if (this.onChangeTemplateCallback) {
                        this.onChangeTemplateCallback(template);
                      }
                    }}
                    size={this.size}
                  />
                </OptionsContext.Provider>
              </PropPanelRegistry.Provider>
            </RendererRegistry.Provider>
          </FontContext.Provider>
        </I18nContext.Provider>
      </ConfigProvider>,
      this.domContainer
    );
  }
}

export default Designer;
