import React, { useEffect, useRef } from 'react';
import { generate, Designer, Viewer, Form, Template } from '../../../../src/index';
import Layout from '@theme/Layout';
import { getTemplate } from '../../libs/helper';

const headerHeight = 60;
const controllHeight = 60;

const TemplateDesign = () => {
  const designerRef = useRef<HTMLDivElement | null>(null);
  const designer = useRef<Designer | null>(null);

  useEffect(() => {
    if (designerRef.current) {
      designer.current = new Designer({
        domContainer: designerRef.current,
        template: getTemplate(),
      });

      designer.current.onSaveTemplate((t) => {
        console.log(t);
      });

      designer.current.onChangeTemplate(() => {
        designer.current.saveTemplate();
      });
    }
  }, [designerRef]);

  return (
    <Layout title="Template Design">
      <div
        style={{
          height: controllHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
        }}
      >
        <div>
          <button
            onClick={() => {
              console.log('IMPL');
            }}
            className="button button--sm button--outline button--primary"
          >
            How to use
          </button>
        </div>
        <div>
          <button
            style={{ marginRight: '1rem' }}
            onClick={() => {
              console.log('IMPL');
            }}
            className="button button--sm button--outline button--success"
          >
            Change BasePDF
          </button>
          <button
            style={{ marginRight: '1rem' }}
            onClick={() => {
              console.log('IMPL');
            }}
            className="button button--sm button--outline button--info"
          >
            Load Template
          </button>
          <button
            style={{ marginRight: '1rem' }}
            onClick={() => {
              console.log('IMPL');
            }}
            className="button button--sm button--outline button--warning"
          >
            Download Template
          </button>
          <button
            style={{ marginRight: '1rem' }}
            onClick={() => {
              console.log('IMPL');
            }}
            className="button button--sm button--outline button--danger"
          >
            Get Code
          </button>
          <button
            onClick={() => {
              console.log('IMPL');
            }}
            className="button button--sm button--outline button--secondary"
          >
            Preview PDF
          </button>
        </div>
      </div>

      <div
        ref={designerRef}
        style={{
          width: '100%',
          height: `calc(100vh - ${headerHeight + controllHeight}px)`,
        }}
      ></div>
    </Layout>
  );
};

export default TemplateDesign;
