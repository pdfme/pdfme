import { forwardRef, ChangeEvent, useContext } from 'react';
import * as styles from './index.module.scss';
import { zoom } from '../../../libs/constants';
import { readFiles } from '../../../libs/utils';
import { SchemaUIProp } from '../../../libs/type';
import { I18nContext } from '../../../libs/i18n';

const ImageSchema = forwardRef<HTMLInputElement, SchemaUIProp>(
  ({ schema, editable, placeholder, tabIndex, onChange }, ref) => {
    const i18n = useContext(I18nContext);
    const value = schema.data;
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
                  ref={ref}
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
  }
);

export default ImageSchema;
