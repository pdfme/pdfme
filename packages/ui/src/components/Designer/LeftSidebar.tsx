import React, { useContext, useState, useEffect } from 'react';
import { Schema, Plugin, BasePdf, getFallbackFontName } from '@pdfme/common';
import { theme, Button } from 'antd';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Renderer from '../Renderer.js';
import { LEFT_SIDEBAR_WIDTH } from '../../constants.js';
import { setFontNameRecursively } from '../../helper';
import { OptionsContext, PluginsRegistry } from '../../contexts.js';
import PluginIcon from './PluginIcon.js';

const Draggable = (props: {
  plugin: Plugin<Schema>;
  scale: number;
  basePdf: BasePdf;
  children: React.ReactNode;
}) => {
  const { scale, basePdf, plugin } = props;
  const { token } = theme.useToken();
  const options = useContext(OptionsContext);
  const defaultSchema = plugin.propPanel.defaultSchema;
  if (options.font) {
    const fontName = getFallbackFontName(options.font);
    setFontNameRecursively(defaultSchema, fontName);
  }
  const draggable = useDraggable({ id: defaultSchema.type, data: defaultSchema });
  const { listeners, setNodeRef, attributes, transform, isDragging } = draggable;
  const style = { transform: CSS.Translate.toString(transform) };

  const renderedSchema = React.useMemo(
    () => (
      <div style={{ transform: `scale(${scale})` }}>
        <Renderer
          schema={{ ...defaultSchema, id: defaultSchema.type }}
          basePdf={basePdf}
          value={defaultSchema.content || ''}
          onChangeHoveringSchemaId={() => {
            void 0;
          }}
          mode={'viewer'}
          outline={`1px solid ${token.colorPrimary}`}
          scale={scale}
        />
      </div>
    ),
    [defaultSchema, basePdf, scale, token.colorPrimary],
  );

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {isDragging && renderedSchema}
      <div style={{ visibility: isDragging ? 'hidden' : 'visible' }}>{props.children}</div>
    </div>
  );
};

const LeftSidebar = ({
  height,
  scale,
  basePdf,
}: {
  height: number;
  scale: number;
  basePdf: BasePdf;
}) => {
  const { token } = theme.useToken();
  const pluginsRegistry = useContext(PluginsRegistry);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        left: 0,
        right: 0,
        position: 'absolute',
        zIndex: 1,
        height,
        width: LEFT_SIDEBAR_WIDTH,
        background: token.colorBgLayout,
        textAlign: 'center',
        overflow: isDragging ? 'visible' : 'auto',
      }}
    >
      {pluginsRegistry.entries().map(([label, plugin]) => {
        if (!plugin?.propPanel.defaultSchema) return null;

        return (
          <Draggable key={label} scale={scale} basePdf={basePdf} plugin={plugin}>
            <Button
              onMouseDown={() => setIsDragging(true)}
              style={{ width: 35, height: 35, marginTop: '0.25rem', padding: '0.25rem' }}
            >
              <PluginIcon plugin={plugin} label={label} />
            </Button>
          </Draggable>
        );
      })}
    </div>
  );
};

export default LeftSidebar;
