import React, { forwardRef, RefObject, Ref, ReactNode } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { ZOOM, SELECTABLE_CLASSNAME } from '../../libs/constants';
import { SchemaForUI, isTextSchema, isImageSchema, isBarcodeSchema } from '../../libs/type';
import TextSchema from './TextSchema';
import ImageSchema from './ImageSchema';
import BarcodeSchema from './BarcodeSchema';

export interface SchemaUIProps {
  schema: SchemaForUI;
  editable: boolean;
  onChange: (value: string) => void;
  tabIndex?: number;
  placeholder?: string;
}

type Props = SchemaUIProps & { border: string };

const getBgc = (schema: SchemaForUI) =>
  schema.type === 'text' && schema.backgroundColor ? schema.backgroundColor : 'transparent';

const Wrapper = ({ children, border, schema }: Props & { children: ReactNode }) => (
  <div>
    <Tippy delay={0} interactive content={schema.key}>
      <div
        className={SELECTABLE_CLASSNAME}
        id={schema.id}
        style={{
          position: 'absolute',
          height: schema.height * ZOOM,
          width: schema.width * ZOOM,
          top: schema.position.y * ZOOM,
          left: schema.position.x * ZOOM,
          border,
          backgroundColor: getBgc(schema),
        }}
      >
        {children}
      </div>
    </Tippy>
  </div>
);

const SchemaUI = (props: Props, ref: Ref<HTMLTextAreaElement | HTMLInputElement>) => {
  const r = {
    [props.editable ? 'ref' : '']: ref as RefObject<HTMLTextAreaElement | HTMLInputElement>,
  };
  const { schema } = props;

  return (
    <Wrapper {...props}>
      {isTextSchema(schema) && <TextSchema {...r} {...props} schema={schema} />}
      {isImageSchema(schema) && <ImageSchema {...r} {...props} schema={schema} />}
      {isBarcodeSchema(schema) && <BarcodeSchema {...r} {...props} schema={schema} />}
    </Wrapper>
  );
};
export default forwardRef<HTMLTextAreaElement | HTMLInputElement, Props>(SchemaUI);
