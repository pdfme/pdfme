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
import DesignerComponent, { type DesignerHandle } from './components/Designer/index.js';
import AppContextProvider from './components/AppContextProvider.js';

class Designer extends BaseUIClass {
  private onSaveTemplateCallback?: (template: Template) => void;
  private onChangeTemplateCallback?: (template: Template) => void;
  private onPageChangeCallback?: (pageInfo: { currentPage: number; totalPages: number }) => void;
  private pageCursor: number = 0;
  private designerHandle: { current: DesignerHandle | null } = { current: null };

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

  public getPageCursor() {
    return this.pageCursor;
  }

  public getTotalPages() {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    return this.template.schemas.length;
  }

  /**
   * Converts a screen coordinate from a mouse or drag event into a template
   * position expressed in millimetres.
   *
   * Returns `{ pageIndex, x, y }` when the event coordinates lie inside one of
   * the rendered page elements, or `null` when they fall outside every page.
   *
   * Throws if the Designer instance has already been destroyed.
   *
   * @example
   * ```ts
   * document.addEventListener('dragover', (e) => {
   *   const pos = designer.getPositionFromEvent(e);
   *   if (pos) {
   *     console.log(`page ${pos.pageIndex}: x=${pos.x}mm y=${pos.y}mm`);
   *   }
   * });
   * ```
   */
  public getPositionFromEvent(
    e: MouseEvent | DragEvent,
  ): { pageIndex: number; x: number; y: number } | null {
    if (!this.domContainer) throw Error(DESTROYED_ERR_MSG);
    return this.designerHandle.current?.getPositionFromEvent(e) ?? null;
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
          size={this.size}
          handleRef={this.designerHandle}
        />
      </AppContextProvider>,
    );
  }
}

export default Designer;
