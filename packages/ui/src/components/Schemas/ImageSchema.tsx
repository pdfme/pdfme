import React, { useState, forwardRef, ChangeEvent, Ref } from 'react';
import { ImageSchema } from '@pdfme/common';
import { SchemaUIProps } from './SchemaUI';
import { readFiles } from '../../helper';
import { ZOOM } from '../../constants';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Props = SchemaUIProps & { schema: ImageSchema };

const ImageSchemaUI = (props: Props, ref: Ref<HTMLInputElement>) => {
  const { editable, placeholder, tabIndex, schema, onChange } = props;
  const [fileName, setFileName] = useState<string>('');
  const hasData = Boolean(schema.data);

  const size: React.CSSProperties = { width: schema.width * ZOOM, height: schema.height * ZOOM };

  return (
    <>
      <div
        style={{
          ...size,
          opacity: hasData ? 1 : 0.5,
          backgroundImage: hasData || !editable ? 'none' : `url(${placeholder})`,
          backgroundSize: `${size.width}px ${size.height}px`,
        }}
        onClick={(e) => {
          if (editable) {
            e.stopPropagation();
          }
        }}
      >
        {hasData && <img style={{ ...size, borderRadius: 0 }} src={schema.data} />}
        {hasData && editable && (
          <button
            tabIndex={tabIndex}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#333',
              background: '#f2f2f2',
              borderRadius: 2,
              border: '1px solid #767676',
              cursor: 'pointer',
              height: 24,
              width: 24,
            }}
            aria-label="close"
            onClick={() => {
              setFileName('');
              onChange('');
            }}
          >
            <XMarkIcon width={10} height={10} />
          </button>
        )}
      </div>
      <label
        style={{
          display: editable ? 'flex' : 'none',
          position: 'absolute',
          top: '50%',
          width: '100%',
          cursor: 'pointer',
        }}
      >
        <input
          ref={ref}
          tabIndex={tabIndex}
          value={fileName}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            readFiles(event.target.files, 'dataURL').then((result) => onChange(result as string))
          }
          type="file"
          accept="image/jpeg, image/png"
        />
      </label>
    </>
  );
};

export default forwardRef<HTMLInputElement, Props>(ImageSchemaUI);
