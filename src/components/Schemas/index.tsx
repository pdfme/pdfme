import { forwardRef } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { zoom, selectableClassName, barcodeList } from '../../libs/constants';
import { SchemaUIProp } from '../../libs/type';
import TextSchema from './TextSchema';
import ImageSchema from './ImageSchema';
import BarcodeSchema from './BarcodeSchema';

type Props = SchemaUIProp & {
  border: string;
};

const Schema = forwardRef<HTMLTextAreaElement | HTMLInputElement, Props>(
  ({ schema, editable, placeholder, tabIndex, onChange, border }, ref) => (
    <div>
      <Tippy delay={0} interactive content={schema.key}>
        <div
          className={selectableClassName}
          id={schema.id}
          style={{
            position: 'absolute',
            height: +schema.height * zoom,
            width: +schema.width * zoom,
            top: +schema.position.y * zoom,
            left: +schema.position.x * zoom,
            border,
            backgroundColor:
              schema.type === 'text' && schema.backgroundColor
                ? schema.backgroundColor
                : 'transparent',
          }}
        >
          {schema.type === 'text' && (
            <TextSchema
              {...{ [editable ? 'ref' : '']: ref as React.RefObject<HTMLTextAreaElement> }}
              schema={schema}
              editable={editable}
              placeholder={placeholder}
              tabIndex={tabIndex}
              onChange={onChange}
            />
          )}
          {schema.type === 'image' && (
            <ImageSchema
              {...{ [editable ? 'ref' : '']: ref as React.RefObject<HTMLInputElement> }}
              schema={schema}
              editable={editable}
              placeholder={placeholder}
              tabIndex={tabIndex}
              onChange={onChange}
            />
          )}
          {barcodeList.includes(schema.type) && (
            <BarcodeSchema
              {...{ [editable ? 'ref' : '']: ref as React.RefObject<HTMLInputElement> }}
              schema={schema}
              editable={editable}
              placeholder={placeholder}
              tabIndex={tabIndex}
              onChange={onChange}
            />
          )}
        </div>
      </Tippy>
    </div>
  )
);

export default Schema;
