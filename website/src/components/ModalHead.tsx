import React from 'react';
import { X } from 'lucide-react';

const ModalHead = ({ title, descriptionElem, handleClose }: { title: string; descriptionElem?: React.ReactElement; handleClose: () => void }) => (
  <>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}
    >
      <h2 style={{ marginBottom: 0 }}>{title}</h2>
      <button
        style={{ display: 'flex' }}
        className="button button--sm button--link"
        onClick={handleClose}
      >
        <X />
      </button>
    </div>
    <div>
      {descriptionElem && descriptionElem}
    </div>
  </>
);

export default ModalHead;
