import React from 'react';
import {
  cloneDeep,
  Template,
  DesignerProps,
  checkDesignerProps,
  checkTemplate,
  checkUIOptions,
  PDFME_VERSION,
  UIOptions,
} from '@pdfme/common';
import { BaseUIClass } from './class.js';
import { DESTROYED_ERR_MSG } from './constants.js';
import DesignerComponent, { type SidebarOpenRequest } from './components/Designer/index.js';
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

export type DesignerUpdateTemplateOptions = {
  page?: number;
};

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (template: Template) => void;
  private onChangeTemplateCallback?: (template: Template) => void;
  private onPageChangeCallback?: (pageInfo: { currentPage: number; totalPages: number }) => void;
  private onChangeSelectionCallback?: DesignerSelectionChangeCallback;
  private pageCursor: number = 0;
  private selection: DesignerSelection = EMPTY_DESIGNER_SELECTION;
  private selectSchemasHandler: DesignerSelectSchemas | null = null;
  private updateTemplatePage?: number;
  /**
   * Template the editor loads. A new reference makes the editor discard its
   * document, selection and schema ids, so it changes only when the host
   * supplies a template; edits made in the editor update `this.template` only.
   */
  private editorTemplate: Template;
  private sidebarOpenRequest?: SidebarOpenRequest;

  constructor(props: DesignerProps) {
    super(props);
    checkDesignerProps(props);
    this.editorTemplate = this.template;
  }

  public updateOptions(options: UIOptions) {
    checkUIOptions(options);
    // The user can toggle the sidebar after the option was set, so every call
    // is a new request even when the value equals the stored option.
    if (typeof options.sidebarOpen === 'boolean') {
      this.sidebarOpenRequest = { open: options.sidebarOpen };
    }
    super.updateOptions(options);
  }

  public saveTemplate() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    if (this.onSaveTemplateCallback) {
      this.onSaveTemplateCallback(this.template);
    }
  }

  public updateTemplate(template: Template, options: DesignerUpdateTemplateOptions = {}) {
    checkTemplate(template);
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    this.template = cloneDeep(template);
    this.editorTemplate = this.template;
    this.updateTemplatePage = options.page;
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

  private readonly handleSaveTemplate = (template: Template) => {
    this.template = template;
    this.template.pdfmeVersion = PDFME_VERSION;
    if (this.onSaveTemplateCallback) {
      this.onSaveTemplateCallback(template);
    }
  };

  private readonly handleChangeTemplate = (template: Template) => {
    this.template = template;
    this.template.pdfmeVersion = PDFME_VERSION;
    if (this.onChangeTemplateCallback) {
      this.onChangeTemplateCallback(template);
    }
  };

  private readonly handlePageCursorChange = (newPageCursor: number, totalPages: number) => {
    this.pageCursor = newPageCursor;
    if (this.onPageChangeCallback) {
      this.onPageChangeCallback({
        currentPage: newPageCursor,
        totalPages: totalPages,
      });
    }
  };

  private readonly handleChangeSelection = (selection: DesignerSelection) => {
    this.selection = cloneDeep(selection);
    if (this.onChangeSelectionCallback) {
      this.onChangeSelectionCallback(cloneDeep(selection));
    }
  };

  private readonly handleRegisterSchemaSelectionHandler = (
    handler: DesignerSelectSchemas | null,
  ) => {
    this.selectSchemasHandler = handler;
  };

  private readonly handleUpdateTemplatePageApplied = (page: number) => {
    if (Object.is(this.updateTemplatePage, page)) {
      this.updateTemplatePage = undefined;
    }
  };

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
          template={this.editorTemplate}
          onSaveTemplate={this.handleSaveTemplate}
          onChangeTemplate={this.handleChangeTemplate}
          onPageCursorChange={this.handlePageCursorChange}
          onChangeSelection={this.handleChangeSelection}
          onRegisterSchemaSelectionHandler={this.handleRegisterSchemaSelectionHandler}
          onUpdateTemplatePageApplied={this.handleUpdateTemplatePageApplied}
          updateTemplatePage={this.updateTemplatePage}
          sidebarOpenRequest={this.sidebarOpenRequest}
          size={this.size}
        />
      </AppContextProvider>,
    );
  }
}

export default Designer;
