import React, { useEffect, forwardRef, RefObject, Ref, ReactNode, useRef } from 'react';
import { SchemaForUI, isTextSchema, isImageSchema, isBarcodeSchema } from '@pdfme/common';
import { ZOOM, SELECTABLE_CLASSNAME } from '../../constants';
import TextSchema from './TextSchema';
import ImageSchema from './ImageSchema';
import BarcodeSchema from './BarcodeSchema';

export interface SchemaUIProps {
  schema: SchemaForUI;
  editable: boolean;
  onChange: (value: string) => void;
  onStopEditing: () => void;
  tabIndex?: number;
  placeholder?: string;
}

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

interface RenderProps {
  rootElement: HTMLElement,
  callback: (message: string) => void
}
interface Renderer {
  [key: string]: { renderer: (arg: RenderProps) => void } | undefined;
}
const buildInRenderer: Renderer = {
  // TODO 
  text: {
    renderer: ({ rootElement, callback }) => {
      const button = document.createElement('button');
      button.textContent = 'text';
      button.addEventListener('click', () => {
        alert('Vanilla Button Clicked');
        callback('Vanilla Button Clicked');
      });
      rootElement.appendChild(button);
    }
  },
  image: {
    renderer: ({ rootElement, callback }) => {
      const button = document.createElement('button');
      button.textContent = 'image';
      button.addEventListener('click', () => {
        alert('Vanilla Button Clicked');
        callback('Vanilla Button Clicked');
      });
      rootElement.appendChild(button);
    }
  },
  qrcode: {
    renderer: ({ rootElement, callback }) => {
      const button = document.createElement('button');
      button.textContent = 'qrcode';
      button.addEventListener('click', () => {
        alert('Vanilla Button Clicked');
        callback('Vanilla Button Clicked');
      });
      rootElement.appendChild(button);
    }
  }
}

const SchemaUI = (props: Props, ref: Ref<HTMLTextAreaElement | HTMLInputElement>) => {
  const { schema, editable } = props;
  const r = {
    [editable ? 'ref' : '']: ref as RefObject<HTMLTextAreaElement | HTMLInputElement>,
  };
  const _ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (_ref.current && schema.type) {
      const schemaType = schema.type as string;
      const rendererObj = buildInRenderer[schemaType];
      if (!rendererObj) {
        //  TODO fallback to default renderer
        return;
      }
      const p = {
        ...r,
        ...props,
        schema,
      }
      rendererObj.renderer({
        rootElement: _ref.current,
        callback: (message) => {
          console.log('message: ', message)
        }
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
      {/* {isTextSchema(schema) && <TextSchema {...r} {...props} schema={schema} />}
      {isImageSchema(schema) && <ImageSchema {...r} {...props} schema={schema} />}
      {isBarcodeSchema(schema) && <BarcodeSchema {...r} {...props} schema={schema} />} */}
    </Wrapper>
  );
};
export default forwardRef<HTMLTextAreaElement | HTMLInputElement, Props>(SchemaUI);
