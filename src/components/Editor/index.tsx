import { Component } from 'react';
import * as styles from './index.module.scss';
import { Template, Schema, TemplateWithPages, TemplateEditorProp } from '../../type';
import Sidebar from './Sidebar';
import Main from './Main';
import { zoom } from '../../constants';
import { i18n } from '../../i18n';
import {
  uuid,
  set,
  cloneDeep,
  debounce,
  round,
  b64toBlob,
  arrayMove,
  pdf2Pngs,
  getPdfPageSizes,
  fmtTemplate,
  sortSchemas,
  getInitialSchema,
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
  template: TemplateWithPages;
  schemas: Schema[][];
  pageCursor: number;
  focusElementId: string;
  activeElements: HTMLElement[];
}

class TemplateEditor extends Component<TemplateEditorProp, State> {
  private copiedSchemas: Schema[] | null = null;
  private past: Schema[][] = [];
  private future: Schema[][] = [];
  private wrapRef: HTMLDivElement | null = null;

  state: State = {
    processing: false,
    template: getInitialTemplate(),
    focusElementId: '',
    activeElements: [],
    schemas: [[]] as Schema[][],
    pageCursor: 0,
  };

  componentDidMount() {
    this.initEvents();

    this.props
      .fetchTemplate()
      .then(async (template) => {
        this.setState(
          {
            template: Object.assign(template, { pages: [] }),
            schemas: sortSchemas(template, template.schemas.length),
          },
          () => this.processAndSetBasePdf(template.basePdf as string)
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
        const { template, pageCursor } = this.state;
        const ps = template.pages[pageCursor].size;
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
        const { template, pageCursor } = this.state;
        const ps = template.pages[pageCursor].size;
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
        const { template } = this.state;
        const _template = cloneDeep<any>(template);
        delete _template.pages;
        const { saveTemplate } = this.props;
        saveTemplate(_template).then(() => this.setState({ processing: false }));
      },
    });

    window.onscroll = debounce(() => {
      const { template } = this.state;
      const pageSizes = template.pages.map((p) => p.size);
      if (!pageSizes[0]) {
        return;
      }
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      const paperWidth = pageSizes[0].width * zoom;
      const scale = width / paperWidth > 1 ? 1 : width / paperWidth;

      const scroll = window.pageYOffset * scale;
      const top = (this.wrapRef ? this.wrapRef.getBoundingClientRect().top : 0) + scroll;
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
    const { pageCursor, template, schemas } = this.state;
    const s = getInitialSchema();
    const paper = document.getElementById(`paper-${pageCursor}`);
    const rectTop = paper ? paper.getBoundingClientRect().top : 0;
    const headerHeight = 53;
    s.position.y = rectTop - headerHeight > 0 ? 0 : template.pages[pageCursor].size.height / 2;
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
    const { schemas, pageCursor, template } = this.state;
    this.future = [];
    this.past.push(cloneDeep(schemas[pageCursor]));
    const _schemas = cloneDeep(schemas);
    _schemas[pageCursor] = newSchemas;
    this.setState(
      {
        template: Object.assign(fmtTemplate(template, _schemas), { pages: template.pages }),
        schemas: _schemas,
      },
      () => cb && cb()
    );
  };

  onSortEnd = (arg: { oldIndex: number; newIndex: number }) => {
    const { schemas, pageCursor } = this.state;
    const _schemas = cloneDeep(schemas);
    const movedSchema = arrayMove(_schemas[pageCursor], arg.oldIndex, arg.newIndex);
    this.commitSchemas(movedSchema);
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
      template: Object.assign(template, { basePdf, pages }),
    });
  };

  saveTemplateWithProcessing = async (template: Template) => {
    this.setState({ processing: true });
    const _template = cloneDeep<any>(template);
    delete _template.pages;
    const tmplt = await this.props.saveTemplate(_template);
    this.setState({ processing: false });
    return tmplt;
  };

  updateTemplate = async (template: Template) => {
    const schemas = sortSchemas(template, template.schemas.length);
    this.setState(
      { template: Object.assign(template, { pages: this.state.template.pages }), schemas },
      () => {
        this.processAndSetBasePdf(template.basePdf as string);
      }
    );
  };

  render() {
    const { processing, template, focusElementId, activeElements, schemas, pageCursor } =
      this.state;
    const { lang, Header } = this.props;
    const activeSchema = this.getLastActiveSchema();
    return (
      <>
        <Header
          processing={processing}
          template={template}
          saveTemplate={this.saveTemplateWithProcessing}
          updateTemplate={this.updateTemplate}
        />
        <div ref={(node) => (this.wrapRef = node)} className={`${styles.wrapper}`}>
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
          <Main
            pageCursor={pageCursor}
            pages={template.pages}
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
