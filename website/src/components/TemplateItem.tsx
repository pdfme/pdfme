import React from 'react';
import clsx from 'clsx';

export default (props: {
  id: string;
  jsonUrl: string;
  imgUrl: string;
  isSelected: boolean;
  colNum: number;
  onClick: (id: string) => void;
}) => {
  const { isSelected, onClick, imgUrl, id, colNum } = props;
  return (
    <div className={clsx(`col col--${colNum}`)}>
      <div
        style={{
          marginBottom: '1rem',
          borderRadius: 15,
          border: isSelected ? '5px solid var(--ifm-color-primary)' : 'none',
        }}
      >
        <div className="card shadow--md">
          <div className="card__image text--center" onClick={() => onClick(id)}>
            <img src={imgUrl} width="100%" alt="Image alt text" title={`${id}'s image`} />
          </div>
          <div className="card__footer">
            <button
              onClick={() => onClick(id)}
              className={`button button--${isSelected ? 'secondary' : 'primary'} button--block`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
