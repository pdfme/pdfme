import React, { useContext } from 'react';
import {
  Schema,
  Plugin,
  BasePdf,
} from '@pdfme/common';
import { theme, Button } from 'antd';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from "@dnd-kit/utilities";
import Renderer from '../Renderer';
import { PluginsRegistry } from '../../contexts';

const Draggable = (props: { plugin: Plugin<any>, scale: number, basePdf: BasePdf, children: React.ReactNode }) => {
  const { scale, basePdf, plugin } = props;
  const { token } = theme.useToken();
  const defaultSchema = plugin.propPanel.defaultSchema as Schema;
  const draggable = useDraggable({ id: defaultSchema.type, data: defaultSchema });
  const { listeners, setNodeRef, attributes, transform, isDragging } = draggable;
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {isDragging &&
        <div style={{ transform: `scale(${scale})` }}>
          <Renderer
            key={defaultSchema.type}
            schema={{ ...defaultSchema, id: defaultSchema.type, key: defaultSchema.type }}
            basePdf={basePdf}
            value={defaultSchema.content || ''}
            onChangeHoveringSchemaId={() => { void 0 }}
            mode={'viewer'}
            outline={`1px solid ${token.colorPrimary}`}
            scale={scale}
          />
        </div>
      }
      <div style={{ visibility: isDragging ? 'hidden' : 'visible' }}>
        {props.children}
      </div>
    </div>
  );
}

const LeftSidebar = ({ height, scale, basePdf }: { height: number, scale: number, basePdf: BasePdf }) => {
  const { token } = theme.useToken();
  const pluginsRegistry = useContext(PluginsRegistry);

  return <div
    style={{
      left: 0,
      position: 'absolute',
      right: 0,
      zIndex: 1,
      height,
      background: token.colorBgLayout,
      textAlign: 'center',
      width: 45,
    }}
  >
    {Object.entries(pluginsRegistry).map(([label, plugin]) => {
      if (!plugin?.propPanel.defaultSchema) return null;
      return <Draggable
        key={label}
        scale={scale}
        basePdf={basePdf}
        plugin={plugin}>
        <Button
          title={label}
          style={{ width: 35, height: 35, marginTop: '0.25rem', padding: '0.25rem' }}>
          {plugin.propPanel.defaultSchema.icon ?
            <div dangerouslySetInnerHTML={{ __html: plugin.propPanel.defaultSchema.icon }} />
            :
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          }
        </Button>
      </Draggable>
    })}
  </div>
}

export default LeftSidebar