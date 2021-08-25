import labelmake from 'labelmake';
import React, { Component } from 'react';
import * as styles from './index.module.scss';
import { Template, PageSize, Schema, TemplateEditorProp } from '../../types';
import Sidebar from './Sidebar';
import Preview from './Preview';
import { i18n } from '../../i18n';
import { zoom } from '../../constants';
import {
  uuid,
  set,
  cloneDeep,
  debounce,
  readFile,
  blob2File,
  round,
  b64toBlob,
  fileSave,
  arrayMove,
  isIos,
  pdf2Pngs,
  getPdfPageSizes,
  fmtTemplate,
  sortSchemas,
  getInitialSchema,
  fmtTemplateFromJson,
  initShortCuts,
  destroyShortCuts,
  getInitialTemplate,
  getSampleByType,
  getKeepRaitoHeightByWidth,
} from '../../utils';

const fmtValue = (key: string, value: string) => {
  const skip = ['id', 'key', 'type', 'data', 'alignment', 'fontColor', 'backgroundColor'];
  return skip.includes(key) ? value : Number(value) < 0 ? 0 : Number(value);
};

interface State {
  processing: boolean;
  template: Template;
  pageCursor: number;
  pages: { size: PageSize; image: string }[];
  focusElementId: string;
  activeElements: HTMLElement[];
  schemas: Schema[][];
}

class TemplateEditor extends Component<TemplateEditorProp, State> {
  private copiedSchemas: Schema[] | null = null;
  private past: Schema[][] = [];
  private future: Schema[][] = [];
  private prevWrapRef: HTMLDivElement | null = null;

  state: State = {
    processing: false,
    template: getInitialTemplate(),
    focusElementId: '',
    activeElements: [],
    schemas: [[]] as Schema[][],
    pageCursor: 0,
    pages: [],
  };

  componentDidMount() {
    this.initEvents();

    this.props
      .fetchTemplate()
      .then(async (template) => {
        this.setState({ template, schemas: sortSchemas(template, template.schemas.length) }, () =>
          this.processAndSetBasePdf(template.basePdf as string)
        );
      })
      .catch(console.error);
  }

  componentWillUnmount() {
    this.destroyEvents();
  }

  initEvents = () => {
    initShortCuts({
      move: (command, isShift) => {
        const { pages, pageCursor } = this.state;
        const ps = pages[pageCursor].size;
        const activeSchemas = this.getActiveSchemas();
        const arg = activeSchemas.map((as) => {
          let key: 'x' | 'y' = 'x';
          let value = 0;
          const num = isShift ? 0.1 : 1;
          const { position, height, width } = as;
          switch (command) {
            case 'up': {
              key = 'y';
              value = round(position['y'] - num, 2);
              break;
            }
            case 'down': {
              key = 'y';
              value = round(position['y'] + num, 2);
              break;
            }
            case 'left':
              value = round(position['x'] - num, 2);
              break;
            case 'right':
              value = round(position['x'] + num, 2);
              break;
          }
          if (key === 'x') {
            value = value > ps.width - width ? ps.width - width : value;
          } else {
            value = value > ps.height - height ? ps.height - height : value;
          }
          return {
            key: 'position.' + key,
            value: String(value),
            schemaId: as.id,
          };
        });
        this.changeSchema(arg);
      },
      remove: () => {
        const activeSchemaIds = this.getActiveSchemas().map((s) => s.id);
        const { schemas, pageCursor } = this.state;
        this.commitSchemas(
          schemas[pageCursor].filter((schema) => !activeSchemaIds.includes(schema.id)),
          () => this.setState({ activeElements: [] })
        );
      },
      esc: () => {
        this.onEditEnd();
      },
      copy: () => {
        const activeSchemas = this.getActiveSchemas();
        if (activeSchemas.length === 0) return;
        this.copiedSchemas = activeSchemas;
      },
      paste: () => {
        if (!this.copiedSchemas || this.copiedSchemas.length === 0) return;
        const { pages, pageCursor } = this.state;
        const ps = pages[pageCursor].size;
        const _schemas = this.copiedSchemas.map((cs) => {
          const { height, width, position: p } = cs;
          const position = {
            x: p.x + 10 > ps.width - width ? ps.width - width : p.x + 10,
            y: p.y + 10 > ps.height - height ? ps.height - height : p.y + 10,
          };
          const schema = Object.assign(cloneDeep(cs), {
            id: uuid(),
            position,
          });
          schema.key = schema.key + ' copy';
          return schema;
        });

        const { schemas } = this.state;
        this.commitSchemas(schemas[pageCursor].concat(_schemas));
        this.setActiveElements(_schemas.map((s) => document.getElementById(s.id)!));
        this.copiedSchemas = _schemas;
      },
      redo: () => {
        if (this.future.length <= 0) return;
        const { schemas, pageCursor } = this.state;
        this.past.push(cloneDeep(schemas[pageCursor]));
        const s = cloneDeep(schemas);
        s[pageCursor] = this.future.pop()!;
        this.setState({ activeElements: [], schemas: s });
      },
      undo: () => {
        if (this.past.length <= 0) return;
        const { schemas, pageCursor } = this.state;
        this.future.push(cloneDeep(schemas[pageCursor]));
        const s = cloneDeep(schemas);
        s[pageCursor] = this.past.pop()!;
        this.setState({ activeElements: [], schemas: s });
      },
      save: () => {
        this.setState({ processing: true });
        const { schemas, template } = this.state;
        const { saveTemplate } = this.props;
        const fmtdTemplate = fmtTemplate(template, schemas);
        saveTemplate(fmtdTemplate).then(() => this.setState({ processing: false }));
      },
    });

    window.onscroll = debounce(() => {
      const { pages } = this.state;
      const pageSizes = pages.map((p) => p.size);
      if (!pageSizes[0]) {
        return;
      }
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      const paperWidth = pageSizes[0].width * zoom;
      const scale = width / paperWidth > 1 ? 1 : width / paperWidth;

      const scroll = window.pageYOffset * scale;
      const top = (this.prevWrapRef ? this.prevWrapRef.getBoundingClientRect().top : 0) + scroll;
      const pageHeights = pageSizes.reduce((acc, cur, i) => {
        let value = cur.height * zoom * scale;
        if (i === 0) {
          value += top - value / 2;
        } else {
          value += acc[i - 1];
        }
        return acc.concat(value);
      }, [] as number[]);
      let pageCursor = 0;
      pageHeights.forEach((ph, i) => {
        if (scroll > ph) {
          pageCursor = i + 1 >= pageHeights.length ? pageHeights.length - 1 : i + 1;
        }
      });
      if (pageCursor !== this.state.pageCursor) {
        this.setState({ pageCursor }, () => this.onEditEnd());
      }
    }, 100);
  };

  destroyEvents = () => {
    destroyShortCuts();
    window.onscroll = () => {};
  };

  getActiveSchemas = () => {
    const { activeElements, pageCursor, schemas } = this.state;
    const ids = activeElements.map((ae) => ae.id);
    return schemas[pageCursor].filter((s) => ids.includes(s.id));
  };

  getLastActiveSchema = () => {
    const { activeElements, pageCursor, schemas } = this.state;
    if (activeElements.length === 0) return getInitialSchema();
    const last = activeElements[activeElements.length - 1];
    return schemas[pageCursor].find((s) => s.id === last.id) || getInitialSchema();
  };

  setActiveElements = (targets: HTMLElement[]) => {
    this.setState({ activeElements: targets });
  };

  addSchema = () => {
    const { lang } = this.props;
    const { pageCursor, pages, schemas } = this.state;
    const s = getInitialSchema();
    const paper = document.getElementById(`paper-${pageCursor}`);
    const rectTop = paper ? paper.getBoundingClientRect().top : 0;
    const headerHeight = 53;
    s.position.y = rectTop - headerHeight > 0 ? 0 : pages[pageCursor].size.height / 2;
    s.data = 'text';
    s.key = `${i18n(lang, 'field')}${schemas[pageCursor].length + 1}`;
    this.commitSchemas(schemas[pageCursor].concat(s), () => {
      this.setActiveElements([document.getElementById(s.id)!]);
    });
  };

  removeSchema = (id: string) => {
    const { schemas, pageCursor } = this.state;
    this.commitSchemas(
      schemas[pageCursor].filter((schema) => schema.id !== id),
      () => this.setState({ activeElements: [] })
    );
  };

  changeSchema = (obj: { key: string; value: string; schemaId: string }[]) => {
    const { schemas, pageCursor } = this.state;
    const newSchemas = obj.reduce((acc, { key, value, schemaId }) => {
      const tgt = acc.find((s) => s.id === schemaId)!;
      // Assign to reference
      set(tgt, key, fmtValue(key, value));
      if (key === 'type') {
        // set default value, text or barcode
        set(tgt, 'data', value === 'text' ? 'text' : getSampleByType(value));
        // For barcodes, adjust the height to get the correct ratio.
        if (value !== 'text' && value !== 'image') {
          set(tgt, 'height', getKeepRaitoHeightByWidth(value, tgt.width));
        }
      }
      return acc;
    }, cloneDeep(schemas[pageCursor]));
    this.commitSchemas(newSchemas);
  };

  commitSchemas = (newSchemas: Schema[], cb?: Function) => {
    const { schemas, pageCursor } = this.state;
    this.future = [];
    this.past.push(cloneDeep(schemas[pageCursor]));
    const s = cloneDeep(schemas);
    s[pageCursor] = newSchemas;
    this.setState({ schemas: s }, () => {
      cb && cb();
    });
  };

  handleChangeFontName = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { template } = this.state;
    const fontName = e.target.value;
    this.setState({ template: Object.assign(template, { fontName }) });
  };

  changeCanvaId = (canvaId: string) => {
    const { template } = this.state;
    this.setState({
      template: Object.assign(template, { canvaId }),
    });
  };

  downloadBasePdf = (pdfName: string) => {
    const { template } = this.state;
    const pdfBlob = b64toBlob(template.basePdf as string);
    fileSave(pdfBlob, `${pdfName}.pdf`);
  };

  onSortEnd = (arg: { oldIndex: number; newIndex: number }) => {
    const { schemas, pageCursor } = this.state;
    const _schemas = cloneDeep(schemas);
    const schema = _schemas[pageCursor];
    const movedSchema = arrayMove(schema, arg.oldIndex, arg.newIndex);
    _schemas[pageCursor] = movedSchema;
    this.setState({ schemas: _schemas });
  };

  onEdit = (id: string) => {
    this.setActiveElements([document.getElementById(id)!]);
  };

  onEditEnd = () => {
    this.setState({ activeElements: [] });
  };

  onMouseEnter = (id: string) => {
    this.setState({ focusElementId: id });
  };

  onMouseLeave = () => {
    this.setState({ focusElementId: '' });
  };

  previewPdf = () => {
    const { lang } = this.props;
    if (isIos()) {
      alert(i18n(lang, 'previewWarnMsg'));
      return;
    }
    this.setState({ processing: true });
    labelmake({
      inputs: [
        this.state.schemas.reduce((acc, cur) => {
          cur.forEach((c) => {
            acc[c.key] = c.data;
          });
          return acc;
        }, {} as { [key: string]: string }),
      ],
      template: fmtTemplate(this.state.template, this.state.schemas),
    })
      .then((pdf) => {
        const blob = new Blob([pdf.buffer], { type: 'application/pdf' });
        window.open(URL.createObjectURL(blob));
      })
      .catch(() => {
        alert(i18n(lang, 'previewErrMsg'));
      })
      .then(() => this.setState({ processing: false }));
  };

  processAndSetBasePdf = async (basePdf: string) => {
    const { template } = this.state;
    const pdfBlob = b64toBlob(basePdf as string);
    const pageSizes = await getPdfPageSizes(pdfBlob);
    const images = await pdf2Pngs(pdfBlob, pageSizes[0].width * zoom);
    const schemas = (
      this.state.schemas.length < pageSizes.length
        ? this.state.schemas.concat(
            new Array(pageSizes.length - this.state.schemas.length).fill(cloneDeep([]))
          )
        : this.state.schemas.slice(0, images.length)
    ).map((schema, i) => {
      Object.values(schema).forEach((value) => {
        const { width, height } = pageSizes[i];
        const xEdge = value.position.x + value.width;
        const yEdge = value.position.y + value.height;
        if (width < xEdge) {
          const diff = xEdge - width;
          value.position.x += diff;
        }
        if (height < yEdge) {
          const diff = yEdge - height;
          value.position.y += diff;
        }
      });
      return schema;
    });
    const pages = pageSizes.map((size, i) => ({ size, image: images[i] }));

    this.setState({
      activeElements: [],
      focusElementId: '',
      pageCursor: 0,
      schemas,
      pages,
      template: Object.assign(template, { basePdf }),
    });
  };

  changeBasePdf = (file: File) => {
    readFile(file, 'dataURL').then(async (basePdf) => {
      this.processAndSetBasePdf(basePdf as string);
    });
  };

  loadJsonTemplate = (file: File) => {
    fmtTemplateFromJson(file)
      .then((template) => {
        const schemas = sortSchemas(template, template.schemas.length);
        this.setState({ template, schemas });
        this.changeBasePdf(blob2File(b64toBlob(template.basePdf as string), ''));
      })
      .catch(alert);
  };

  saveTemplateWithProcessing = async (template: Template) => {
    this.setState({ processing: true });
    const tmplt = await this.props.saveTemplate(template);
    this.setState({ processing: false });
    return tmplt;
  };

  render() {
    const { processing, template, focusElementId, activeElements, schemas, pageCursor, pages } =
      this.state;
    const { lang, EditorCtl } = this.props;
    const activeSchema = this.getLastActiveSchema();
    return (
      <>
        <EditorCtl
          processing={processing}
          template={template}
          schemas={schemas}
          changeBasePdf={this.changeBasePdf}
          changeCanvaId={this.changeCanvaId}
          previewPdf={this.previewPdf}
          downloadBasePdf={this.downloadBasePdf}
          saveTemplate={this.saveTemplateWithProcessing}
          loadJsonTemplate={this.loadJsonTemplate}
          handleChangeFontName={this.handleChangeFontName}
        />
        <div ref={(node) => (this.prevWrapRef = node)} className={`${styles.wrapper}`}>
          <Sidebar
            lang={lang}
            pageCursor={pageCursor}
            activeElement={activeElements[activeElements.length - 1]}
            schemas={schemas[pageCursor]}
            focusElementId={focusElementId}
            activeSchema={activeSchema}
            changeSchema={this.changeSchema}
            onSortEnd={this.onSortEnd}
            onEdit={this.onEdit}
            onEditEnd={this.onEditEnd}
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
            addSchema={this.addSchema}
            removeSchema={this.removeSchema}
          />
          <Preview
            pageCursor={pageCursor}
            pages={pages}
            activeElements={activeElements}
            focusElementId={focusElementId}
            template={template}
            schemas={schemas}
            changeSchema={this.changeSchema}
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
            onSelectSchemas={this.setActiveElements}
          />
        </div>
      </>
    );
  }
}

export default TemplateEditor;
