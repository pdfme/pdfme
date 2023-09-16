import React, { useEffect, useContext, forwardRef, Ref, ReactNode, useRef } from 'react';
import { ZOOM, SELECTABLE_CLASSNAME } from '../../constants';
import { RendererContext, OptionsContext } from '../../contexts';
import { SchemaUIProps } from "../../types"

type Props = SchemaUIProps & {
  outline: string;
  onChangeHoveringSchemaId?: (id: string | null) => void;
};

const Wrapper = ({
  children,
  outline,
  onChangeHoveringSchemaId,
  schema,
}: Props & { children: ReactNode }) => (
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

const SchemaUI = (props: Props, ref: Ref<HTMLTextAreaElement | HTMLInputElement>) => {
  const rendererRegistry = useContext(RendererContext);
  const options = useContext(OptionsContext);

  const { schema, editable, onChange, stopEditing, tabIndex, placeholder } = props;

  const _ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (_ref.current && schema.type) {
      const schemaType = schema.type as string;
      const renderer = rendererRegistry[schemaType];
      if (!renderer) {
        //  TODO fallback to default renderer or Error
        return;
      }

      renderer.render({
        value: schema.data,
        schema,
        rootElement: _ref.current,
        editing: editable, // TODO editingが正しく動かないはず
        onChange: editable ? onChange : undefined,
        stopEditing: editable ? stopEditing : undefined,
        tabIndex,
        placeholder,
        options,
        // 文平さんにメール
      });
    }
    return () => {
      if (_ref.current) {
        _ref.current.innerHTML = '';
      }
    };
  }, [schema.type]);


  return (
    <Wrapper {...props}>
      <div ref={_ref}></div>
    </Wrapper>
  );
};
// TODO forwardRefは不要にしたい
export default forwardRef<HTMLTextAreaElement | HTMLInputElement, Props>(SchemaUI);
