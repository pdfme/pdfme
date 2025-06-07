import React from 'react';
import { Template } from '@pdfme/common';

interface LayoutNode {
  index: number;
  schema?: any;
  children: LayoutNode[];
  width: number;
  height: number;
  padding: [number, number, number, number];
  position: { x: number; y: number };
}

interface DebugLayoutViewProps {
  longPage: LayoutNode | null;
  brokenPages: LayoutNode[] | null;
  newTemplate: Template | null;
  onClose: () => void;
}

const ELEMENT_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
const VISUAL_SCALE = 1.2;

const DebugLayoutView: React.FC<DebugLayoutViewProps> = ({ longPage, brokenPages, newTemplate, onClose }) => {
  if (!longPage || !brokenPages || !newTemplate) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'white',
        zIndex: 9999,
        overflow: 'auto',
        padding: '20px',
        paddingTop: '60px',
        fontFamily: 'monospace',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          padding: '10px 20px',
          background: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 10000,
        }}
      >
        ✖ Close Debug View
      </button>
      
      <h1 style={{ marginBottom: '20px' }}>PDFme Debug View - LayoutNode Visualization</h1>
      
      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ flex: 1 }}>
          <h2>Long Page (Before Breaking)</h2>
          <PageVisual page={longPage} />
        </div>
        
        <div style={{ flex: 1 }}>
          <h2>Broken Pages ({brokenPages.length} pages)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {brokenPages.map((page, idx) => (
              <div key={idx}>
                <h3 style={{ marginBottom: '10px', fontSize: '16px' }}>Page {idx + 1}</h3>
                <PageVisual page={page} />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <ToggleSection title="New Template">
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', borderRadius: '4px' }}>
          {JSON.stringify({
            basePdf: newTemplate.basePdf,
            schemas: newTemplate.schemas.map((page, idx) => ({
              page: idx + 1,
              schemas: page.map((s) => ({
                name: s.name,
                type: s.type,
                position: s.position,
                height: s.height,
                __bodyRange: s.__bodyRange,
                __isSplit: s.__isSplit
              }))
            }))
          }, null, 2)}
        </pre>
      </ToggleSection>
    </div>
  );
};


// Toggle Section Component
const ToggleSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {isOpen ? '▼' : '▶'} {title}
      </h2>
      {isOpen && children}
    </div>
  );
};

// Page Visual Component
const PageVisual: React.FC<{ page: LayoutNode }> = ({ page }) => {
  const scale = VISUAL_SCALE;
  
  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          position: 'relative',
          width: page.width * scale,
          height: page.height * scale,
          border: '3px solid #000',
          background: '#fff',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          boxSizing: 'content-box',
        }}
      >
        {/* Padding visualization */}
        {page.padding && (
          <div
            style={{
              position: 'absolute',
              top: page.padding[0] * scale,
              left: page.padding[3] * scale,
              right: page.padding[1] * scale,
              bottom: page.padding[2] * scale,
              border: '1px dashed #666',
              background: 'rgba(200, 200, 200, 0.1)',
            }}
          />
        )}
        
        {/* Child elements */}
        {page.children?.map((child, idx) => {
          const color = ELEMENT_COLORS[idx % ELEMENT_COLORS.length];
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: (child.position?.x || 0) * scale,
                top: (child.position?.y || 0) * scale,
                width: (child.width || 0) * scale,
                height: (child.height || 0) * scale,
                border: `2px solid ${color}`,
                background: `${color}33`,
                fontSize: Math.max(14, scale * 12),
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
              title={`${child.schema?.name || 'Element'} (${child.schema?.type || 'unknown'})`}
            >
              <div style={{ padding: '4px', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.2 }}>
                {child.schema?.name || 'Element'}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Elements Details */}
      <ElementsDetails elements={page.children} />
    </div>
  );
};

// Elements Details Component  
const ElementsDetails: React.FC<{ elements?: LayoutNode[] }> = ({ elements }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (!elements || elements.length === 0) return null;
  
  return (
    <div style={{ width: '100%', marginTop: '20px' }}>
      <h4
        onClick={() => setIsOpen(!isOpen)}
        style={{
          marginTop: 0,
          cursor: 'pointer',
          userSelect: 'none',
          padding: '10px',
          background: '#f0f0f0',
          borderRadius: '4px',
          marginBottom: '10px',
        }}
      >
        {isOpen ? '▼' : '▶'} Elements Details
      </h4>
      
      {isOpen && (
        <div style={{
          fontSize: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          padding: '10px',
          borderRadius: '4px',
        }}>
          {elements.map((child, idx) => {
            const color = ELEMENT_COLORS[idx % ELEMENT_COLORS.length];
            return (
              <div
                key={idx}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  borderLeft: `4px solid ${color}`,
                  background: '#f5f5f5',
                }}
              >
                <strong>{child.schema?.name || 'Element'}</strong> ({child.schema?.type || 'unknown'})<br />
                Position: ({child.position?.x?.toFixed(2) || 0}, {child.position?.y?.toFixed(2) || 0})<br />
                Size: {child.width?.toFixed(2) || 0} × {child.height?.toFixed(2) || 0}<br />
                {child.schema?.__bodyRange && (
                  <>Body Range: {child.schema.__bodyRange.start}-{child.schema.__bodyRange.end}<br /></>
                )}
                {child.schema?.__isSplit && <span style={{ color: 'red' }}>SPLIT</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DebugLayoutView;