import React, { useEffect, useContext, ReactNode, useRef } from 'react';
import { ZOOM, SELECTABLE_CLASSNAME } from '../constants';
import { RendererRegistry, OptionsContext } from '../contexts';
import { RendererProps } from "../types"

const Wrapper = ({
  children,
  outline,
  onChangeHoveringSchemaId,
  schema,
}: RendererProps & { children: ReactNode }) => (
  <div
    title={schema.key}
    onMouseEnter={() => onChangeHoveringSchemaId && onChangeHoveringSchemaId(schema.id)}
    onMouseLeave={() => onChangeHoveringSchemaId && onChangeHoveringSchemaId(null)}
    className={SELECTABLE_CLASSNAME}
    id={schema.id}
    style={{
      position: 'absolute',
      cursor: 'pointer',
      height: schema.height * ZOOM,
      width: schema.width * ZOOM,
      top: schema.position.y * ZOOM,
      left: schema.position.x * ZOOM,
      outline,
    }}
  >
    {children}
  </div>
);

const Renderer = (props: RendererProps) => {
  const rendererRegistry = useContext(RendererRegistry);
  const options = useContext(OptionsContext);

  const { schema, mode, onChange, stopEditing, tabIndex, placeholder } = props;

  const ref = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (ref.current && schema.type) {
      const schemaType = schema.type as string;
      const renderer = rendererRegistry[schemaType];
      if (!renderer) {
        console.error(`Renderer for type ${schema.type} not found`);
        return;
      }

      ref.current.innerHTML = '';

      const isForm = mode === 'form';

      renderer.render({
        value: schema.data,
        schema,
        rootElement: ref.current,
        mode,
        onChange: isForm ? onChange : undefined,
        stopEditing: isForm ? stopEditing : undefined,
        tabIndex,
        placeholder,
        options,
      });
    }
    return () => {
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [JSON.stringify(schema), mode, options]);


  return (
    <Wrapper {...props}>
      <div style={{ height: '100%', width: '100%' }} ref={ref} />
    </Wrapper>
  );
};
export default Renderer
