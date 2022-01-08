import React, { useContext } from 'react';
import * as styles from '../index.module.scss';
import { I18nContext } from '../../../../libs/contexts';
import Divider from '../../../Divider';
import backIcon from '../../../../assets/icons/back.svg';
import deleteIcon from '../../../../assets/icons/delete.svg';
import { SidebarProps } from '../';
import TextPropEditor from './TextPropEditor';
import ExampleInputEditor from './ExampleInputEditor';
import PositionAndSizeEditor from './PositionAndSizeEditor';
import TypeAndKeyEditor from './TypeAndKeyEditor';

const DetailView = (
  props: Pick<
    SidebarProps,
    | 'schemas'
    | 'pageCursor'
    | 'pageSizes'
    | 'changeSchemas'
    | 'activeSchema'
    | 'onEditEnd'
    | 'removeSchema'
  >
) => {
  const { activeSchema, pageCursor, onEditEnd, removeSchema } = props;
  const i18n = useContext(I18nContext);

  return (
    <aside>
      <div className={styles.flx}>
        <button style={{ padding: 5, margin: 5 }} onClick={onEditEnd}>
          <img src={backIcon} width={15} alt="Back icon" />
        </button>
        <h3 style={{ fontWeight: 'bold' }}>
          {i18n('editField')}({pageCursor + 1}P)
        </h3>
        <button style={{ padding: 5, margin: 5 }} onClick={() => removeSchema(activeSchema.id)}>
          <img src={deleteIcon} width={15} alt="Delete icon" />
        </button>
      </div>
      <Divider />
      <TypeAndKeyEditor {...props} />
      <Divider />
      <PositionAndSizeEditor {...props} />
      <Divider />
      {activeSchema.type === 'text' && (
        <>
          <TextPropEditor {...props} />
          <Divider />
        </>
      )}
      <ExampleInputEditor {...props} />
    </aside>
  );
};

export default DetailView;
