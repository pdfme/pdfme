import React, { useState, useContext } from 'react';
import type { SidebarProps } from '../../../types';
import { RULER_HEIGHT, SIDEBAR_WIDTH } from '../../../constants';
import { I18nContext, FontContext } from '../../../contexts';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import ListView from './ListView/index';
import DetailView from './DetailView/index';
import { getFallbackFontName, Schema } from '@pdfme/common';

const Sidebar = (props: SidebarProps) => {
  const { height, size, activeElements, schemas, addSchema } = props;

  const i18n = useContext(I18nContext);
  const font = useContext(FontContext);
  const fallbackFont = getFallbackFontName(font);
  const [open, setOpen] = useState(true);

  const getActiveSchemas = () => {
    const ids = activeElements.map((ae) => ae.id);
    const activeSchema = schemas.find((s) => ids.includes(s.id));

    if (activeSchema?.type === 'text') {
      if (!(activeSchema as Schema & { fontName?: string }).fontName) {
        (activeSchema as Schema & { fontName?: string }).fontName = fallbackFont;
      }
    }

    return schemas.filter((s) => ids.includes(s.id));
  };

  const getLastActiveSchema = () => {
    const activeSchemas = getActiveSchemas();
    return activeSchemas[activeSchemas.length - 1];
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        zIndex: 1,
        height: height ? height : '100%',
        width: open ? SIDEBAR_WIDTH : 0,
      }}
    >
      <div style={{ position: 'sticky', top: 0, zIndex: 1, fontSize: '1rem' }}>
        <button
          type="button"
          style={{
            position: 'absolute',
            top: '1.75rem',
            right: '1rem',
            zIndex: 100,
            border: 'none',
            borderRadius: 2,
            padding: '0.5rem',
            cursor: 'pointer',
            background: '#eee',
            width: 30,
            height: 30,
          }}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ArrowRightIcon width={15} height={15} />
          ) : (
            <ArrowLeftIcon width={15} height={15} />
          )}
        </button>
        <div
          style={{
            width: SIDEBAR_WIDTH,
            height: size.height - RULER_HEIGHT - RULER_HEIGHT / 2,
            display: open ? 'block' : 'none',
            top: RULER_HEIGHT / 2,
            right: 0,
            position: 'absolute',
            background: '#fffffffa',
            color: '#333',
            border: '1px solid #eee',
            padding: '1rem',
            overflowY: 'auto',
            fontFamily: "'Open Sans', sans-serif",
            fontWeight: 400,
            textAlign: 'left',
            boxSizing: 'content-box',
          }}
        >
          {getActiveSchemas().length === 0 ? (
            <ListView {...props} />
          ) : (
            <DetailView {...props} activeSchema={getLastActiveSchema()} />
          )}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              left: 0,
              bottom: '1rem',
              paddingTop: '1rem',
            }}
          >
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e5e5' }} />
            <button
              type="button"
              style={{
                padding: '0.5rem',
                background: '#18a0fb',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                margin: '0 auto',
                display: 'block',
              }}
              onClick={addSchema}
            >
              <strong style={{ color: '#fff' }}>{i18n('addNewField')}</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
