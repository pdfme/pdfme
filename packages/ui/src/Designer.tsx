import React from 'react';
import {
  cloneDeep,
  Template,
  DesignerProps,
  checkDesignerProps,
  checkTemplate,
  PDFME_VERSION,
} from '@pdfme/common';
import { BaseUIClass } from './class.js';
import { DESTROYED_ERR_MSG } from './constants.js';
import DesignerComponent from './components/Designer/index.js';
import AppContextProvider from './components/AppContextProvider.js';
import {
  EMPTY_DESIGNER_SELECTION,
  type DesignerSelectSchemas,
  type DesignerSelectSchemasOptions,
  type DesignerSchemaSelectionTarget,
  type DesignerSelectedSchema,
  type DesignerSelection,
  type DesignerSelectionChangeCallback,
} from './designerSelection.js';

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (template: Template) => void;
  private onChangeTemplateCallback?: (template: Template) => void;
  private onPageChangeCallback?: (pageInfo: { currentPage: number; totalPages: number }) => void;
  private onChangeSelectionCallback?: DesignerSelectionChangeCallback;
  private pageCursor: number = 0;
  private selection: DesignerSelection = EMPTY_DESIGNER_SELECTION;
  private selectSchemasHandler: DesignerSelectSchemas | null = null;

  constructor(props: DesignerProps) {
    super(props);
    checkDesignerProps(props);
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

  public onPageChange(cb: (pageInfo: { currentPage: number; totalPages: number }) => void) {
    this.onPageChangeCallback = cb;
  }

  public onChangeSelection(cb: DesignerSelectionChangeCallback) {
    this.onChangeSelectionCallback = cb;
  }

  public getSelection() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    return cloneDeep(this.selection);
  }

  public getSelectedSchemas(): DesignerSelectedSchema[] {
    return this.getSelection().schemas;
  }

  public selectSchemas(
    targets: DesignerSchemaSelectionTarget | DesignerSchemaSelectionTarget[],
    options?: DesignerSelectSchemasOptions,
  ) {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.selectSchemasHandler?.(targets, options);
  }

  public getPageCursor() {
    return this.pageCursor;
  }

  public getTotalPages() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    return this.template.schemas.length;
  }

  protected render() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.mount(
      <AppContextProvider
        lang={this.getLang()}
        font={this.getFont()}
        plugins={this.getPluginsRegistry()}
        options={this.getOptions()}
      >
        <DesignerComponent
          template={this.template}
          onSaveTemplate={(template) => {
            this.template = template;
            this.template.pdfmeVersion = PDFME_VERSION;
            if (this.onSaveTemplateCallback) {
              this.onSaveTemplateCallback(template);
            }
          }}
          onChangeTemplate={(template) => {
            this.template = template;
            this.template.pdfmeVersion = PDFME_VERSION;
            if (this.onChangeTemplateCallback) {
              this.onChangeTemplateCallback(template);
            }
          }}
          onPageCursorChange={(newPageCursor: number, totalPages: number) => {
            this.pageCursor = newPageCursor;
            if (this.onPageChangeCallback) {
              this.onPageChangeCallback({
                currentPage: newPageCursor,
                totalPages: totalPages,
              });
            }
          }}
          onChangeSelection={(selection) => {
            this.selection = cloneDeep(selection);
            if (this.onChangeSelectionCallback) {
              this.onChangeSelectionCallback(cloneDeep(selection));
            }
          }}
          onRegisterSchemaSelectionHandler={(handler) => {
            this.selectSchemasHandler = handler;
          }}
          size={this.size}
        />
      </AppContextProvider>,
    );
  }
}

export default Designer;
