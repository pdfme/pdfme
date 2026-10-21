import React from 'react';
import { theme, Typography } from 'antd';

const { Text } = Typography;

// form-render passes these props to an object container widget. We override the
// built-in `lineTitle` widget because its CSS hardcodes a black title and a
// light underline, which ignore the Designer theme (unreadable on dark themes).
export interface LineTitleWidgetProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

const LineTitleWidget = ({ title, description, children }: LineTitleWidgetProps) => {
  const { token } = theme.useToken();

  if (!title) return <div>{children}</div>;

  return (
    <div>
      <div
        style={{
          // Same line as antd's Divider, used by the panel's other separators.
          borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
          marginTop: token.marginSM,
          paddingBottom: token.paddingXXS,
          marginBottom: token.marginXS,
        }}
      >
        <Text strong>{title}</Text>
        {description && (
          <Text type="secondary" style={{ marginLeft: token.marginXS }}>
            {description}
          </Text>
        )}
      </div>
      {children}
    </div>
  );
};

export default LineTitleWidget;
