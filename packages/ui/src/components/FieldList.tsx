import React from 'react';
import { Typography, List, Divider } from 'antd';
import { Field } from '@pdfme/common';

interface FieldListProps {
  fields: Field[];
  onFieldClick?: (field: Field) => void;
  availableFields?: Array<string | { name: string; type: string; [key: string]: unknown }>;  
  usedFieldNames?: string[];
}

export const FieldList = ({ 
  fields, 
  onFieldClick,
  availableFields = [],
  usedFieldNames = []
}: FieldListProps) => {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <Typography.Title level={5} style={{ padding: 8, fontWeight: 'bold' }}>
        Fields
      </Typography.Title>
      <List
        size="small"
        dataSource={fields}
        renderItem={(field: Field) => (
          <List.Item
            key={field.name}
            onClick={() => onFieldClick && onFieldClick(field)}
            style={{ cursor: onFieldClick ? 'pointer' : 'default' }}
          >
            {field.name}
          </List.Item>
        )}
      />
      
      {availableFields.length > 0 && (
        <>
          <Divider style={{ margin: '8px 0' }} />
          <Typography.Title level={5} style={{ padding: 8, fontWeight: 'bold' }}>
            Available Dynamic Fields
          </Typography.Title>
          <List
            size="small"
            dataSource={availableFields}
            renderItem={(fieldData) => {
              const fieldName = typeof fieldData === 'string' ? fieldData : fieldData.name;
              const isUsed = usedFieldNames.includes(fieldName);
              return (
                <List.Item
                  key={fieldName}
                  onClick={() => {
                    if (!isUsed && onFieldClick) {
                      if (typeof fieldData === 'string') {
                        onFieldClick({ name: fieldData, type: 'text' });
                      } else {
                        onFieldClick(fieldData as Field);
                      }
                    }
                  }}
                  style={{ 
                    cursor: !isUsed && onFieldClick ? 'pointer' : 'default',
                    opacity: isUsed ? 0.5 : 1,
                    pointerEvents: isUsed ? 'none' : 'auto',
                  }}
                >
                  <div>
                    {fieldName}
                    {isUsed && <div style={{ fontSize: '12px', color: 'rgba(0, 0, 0, 0.45)' }}>(already used)</div>}
                  </div>
                </List.Item>
              );
            }}
          />
        </>
      )}
    </div>
  );
};