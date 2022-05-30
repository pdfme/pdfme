import React from 'react';
import TemplateItem from './TemplateItem';

type Props = {
  selectedTemplateId: string;
  templateItems: { id: string; jsonUrl: string; imgUrl: string }[];
  onClick: (id: string) => void;
};

const DemoAppTemplateList = (props: Props) => {
  const { selectedTemplateId, templateItems, onClick } = props;
  return (
    <div className="container">
      <div className="row">
        <div className={'col col--12'}>
          <h2>
            <a aria-hidden="true" className="anchor enhancedAnchor" id="templates"></a>
            Choose a Template
            <a className="hash-link" href="#templates"></a>
          </h2>
        </div>
        {templateItems.map((props, idx) => (
          <TemplateItem
            key={idx}
            colNum={12 / templateItems.length}
            {...props}
            isSelected={selectedTemplateId === props.id}
            onClick={onClick}
          />
        ))}
      </div>
    </div>
  );
};

export default DemoAppTemplateList;
