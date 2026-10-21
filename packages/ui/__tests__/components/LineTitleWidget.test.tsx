import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfigProvider, theme } from 'antd';
import LineTitleWidget from '../../src/components/Designer/RightSidebar/DetailView/LineTitleWidget';

const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: { colorBgBase: '#232422', colorTextBase: '#E3E2DF' },
};

describe('LineTitleWidget', () => {
  test('draws the section line with the theme split color, like the panel dividers', () => {
    const { colorSplit, lineWidth, lineType } = theme.getDesignToken(darkTheme);
    render(
      <ConfigProvider theme={darkTheme}>
        <LineTitleWidget title="Padding" description="mm">
          <input aria-label="top" />
        </LineTitleWidget>
      </ConfigProvider>,
    );

    const header = screen.getByText('Padding').closest('div')!;
    const expected = document.createElement('div');
    expected.style.borderBottom = `${lineWidth}px ${lineType} ${colorSplit}`;
    expect(header.style.borderBottom).toBe(expected.style.borderBottom);
    expect(header).toHaveTextContent('Paddingmm');
    expect(screen.getByLabelText('top')).toBeInTheDocument();
  });

  test('renders only the children without a title', () => {
    const { container } = render(
      <LineTitleWidget>
        <input aria-label="top" />
      </LineTitleWidget>,
    );

    expect(container).toHaveTextContent('');
    expect(screen.getByLabelText('top')).toBeInTheDocument();
  });
});
