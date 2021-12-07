import { ChangeEvent, useContext } from 'react';
import * as styles from './index.module.scss';
import { zoom } from '../../constants';
import { readFiles } from '../../utils';
import { TemplateSchema } from '../../type';
import { I18nContext } from '../../i18n';

const ImageSchema = ({
  schema,
  value,
  placeholder,
  pageCursor,
  editable,
  tabIndex,
  onChange,
}: {
  schema: TemplateSchema;
  placeholder: string;
  pageCursor: number;
  value: string;
  editable: boolean;
  tabIndex: number;
  onChange: (value: string) => void;
}) => {
  const i18n = useContext(I18nContext);
  return (
    <div>
      {value ? (
        <div style={{ margin: '0 auto' }}>
          {editable && (
            <button
              tabIndex={tabIndex}
              className={styles.dltBtn}
              aria-label="close"
              onClick={() => onChange('')}
            >
              x
            </button>
          )}
          <img
            style={{
              width: schema.width * zoom,
              height: schema.height * zoom,
              borderRadius: 0,
            }}
            src={value}
          />
        </div>
      ) : (
        <label
          className={styles.imageLabel}
          style={{
            height: +schema.height * zoom,
            width: (+schema.width + (schema.characterSpacing || 0) * 0.75) * zoom,
          }}
        >
          {editable && (
            <>
              <input
                tabIndex={tabIndex}
                style={{ display: 'none' }}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const files = event.target.files;
                  readFiles(files, 'dataURL').then((result) => {
                    onChange(result as string);
                  });
                }}
                type="file"
                accept="image/jpeg, image/png"
              />
              <span style={{ zIndex: 1 }}>{i18n('select')}</span>
            </>
          )}
          <div>
            <img
              style={{
                position: 'absolute',
                opacity: 0.5,
                top: 0,
                left: 0,
                width: schema.width * zoom,
                height: schema.height * zoom,
                backgroundImage: `url(${placeholder})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }}
            />
          </div>
        </label>
      )}
    </div>
  );
};

export default ImageSchema;
