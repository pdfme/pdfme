/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import PluginIcon from '../../src/components/Designer/PluginIcon';
import { Plugin, Schema } from '@pdfme/common';
import { OptionsContext } from '../../src/contexts';

// Mock Ant Design theme
jest.mock('antd', () => ({
  theme: {
    useToken: () => ({ token: { colorText: '#000' } })
  }
}));

const mockPlugin: Plugin<Schema> = {
  propPanel: {
    schema: {},
    defaultSchema: { 
      type: 'text',
      name: 'test',
      width: 50,
      height: 20,
      position: { x: 0, y: 0 }
    }
  },
  icon: '<svg><path d="M10 10h10v10h-10z"/></svg>',
  ui: () => {},
  pdf: () => Promise.resolve()
};

const renderPluginIcon = (
  plugin: Plugin<Schema> = mockPlugin,
  options = {},
  props = {}
) => {
  return render(
    <OptionsContext.Provider value={options}>
      <PluginIcon 
        plugin={plugin} 
        label="Test Plugin" 
        size={24}
        {...props}
      />
    </OptionsContext.Provider>
  );
};

describe('PluginIcon Security Tests', () => {
  beforeEach(() => {
    // Clear any previous DOM purify configurations
    jest.clearAllMocks();
  });

  test('renders safe SVG icon correctly', () => {
    const safeSVG = '<svg><path d="M10 10h10v10h-10z"/></svg>';
    const plugin = { ...mockPlugin, icon: safeSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).toContain('<svg');
    expect(svgDiv?.innerHTML).toContain('path');
  });

  test('removes script tags from malicious SVG', () => {
    const maliciousSVG = '<svg><script>alert("XSS")</script><path d="M10 10h10v10h-10z"/></svg>';
    const plugin = { ...mockPlugin, icon: maliciousSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).not.toContain('<script');
    expect(svgDiv?.innerHTML).not.toContain('alert');
  });

  test('removes foreignObject elements', () => {
    const maliciousSVG = '<svg><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject><path d="M10 10h10v10h-10z"/></svg>';
    const plugin = { ...mockPlugin, icon: maliciousSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).not.toContain('<foreignObject');
    expect(svgDiv?.innerHTML).not.toContain('<iframe');
  });

  test('removes use elements with data URLs', () => {
    const maliciousSVG = '<svg><use href="data:image/svg+xml;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4="/></svg>';
    const plugin = { ...mockPlugin, icon: maliciousSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).not.toContain('<use');
    expect(svgDiv?.innerHTML).not.toContain('data:');
  });

  test('removes event handlers from elements', () => {
    const maliciousSVG = '<svg><rect onclick="alert(1)" onload="eval(atob(this.id))" x="0" y="0" width="10" height="10"/></svg>';
    const plugin = { ...mockPlugin, icon: maliciousSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).not.toContain('onclick');
    expect(svgDiv?.innerHTML).not.toContain('onload');
  });

  test('removes namespaced event handlers', () => {
    const maliciousSVG = '<svg xmlns:ev="http://www.w3.org/2001/xml-events"><rect ev:onclick="alert(1)" x="0" y="0" width="10" height="10"/></svg>';
    const plugin = { ...mockPlugin, icon: maliciousSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).not.toContain('ev:onclick');
  });

  test('preserves safe SVG attributes', () => {
    const safeSVG = '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="blue" stroke="red" stroke-width="2"/></svg>';
    const plugin = { ...mockPlugin, icon: safeSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).toContain('viewBox');
    expect(svgDiv?.innerHTML).toContain('fill="blue"');
    expect(svgDiv?.innerHTML).toContain('stroke="red"');
  });

  test('applies size attributes correctly', () => {
    const safeSVG = '<svg><path d="M10 10h10v10h-10z"/></svg>';
    const plugin = { ...mockPlugin, icon: safeSVG };
    
    const { container } = renderPluginIcon(plugin, {}, { size: 48 });
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).toContain('width="48"');
    expect(svgDiv?.innerHTML).toContain('height="48"');
  });

  test('handles invalid SVG gracefully', () => {
    const invalidSVG = '<invalid>not an svg</invalid>';
    const plugin = { ...mockPlugin, icon: invalidSVG };
    
    const { container } = renderPluginIcon(plugin);
    // When SVG is invalid and sanitization results in empty, should render empty div or nothing
    expect(container).toBeInTheDocument();
  });

  test('uses custom icon from options.icons', () => {
    const customSVG = '<svg><circle cx="50" cy="50" r="40"/></svg>';
    const options = {
      icons: {
        text: customSVG
      }
    };
    
    const { container } = renderPluginIcon(mockPlugin, options);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    expect(svgDiv?.innerHTML).toContain('<circle');
  });

  test('falls back to text label when no icon provided', () => {
    const pluginWithoutIcon = { 
      ...mockPlugin, 
      icon: undefined 
    };
    
    const { container } = renderPluginIcon(pluginWithoutIcon);
    const textDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(textDiv).toBeInTheDocument();
    expect(textDiv?.textContent).toBe('Test Plugin');
  });

  test('prevents multiple XSS attack vectors simultaneously', () => {
    const complexMaliciousSVG = `
      <svg xmlns:ev="http://www.w3.org/2001/xml-events">
        <script>alert('script tag')</script>
        <foreignObject>
          <iframe src="javascript:alert('iframe')"></iframe>
        </foreignObject>
        <use href="data:text/html,<script>alert('data url')</script>"/>
        <rect ev:onclick="alert('namespaced')" onclick="alert('normal')" onload="alert('onload')" x="0" y="0" width="10" height="10" fill="blue"/>
        <path d="M10 10h10v10h-10z"/>
      </svg>
    `;
    const plugin = { ...mockPlugin, icon: complexMaliciousSVG };
    
    const { container } = renderPluginIcon(plugin);
    const svgDiv = container.querySelector('div[title="Test Plugin"]');
    
    expect(svgDiv).toBeInTheDocument();
    // Verify all malicious elements are removed
    expect(svgDiv?.innerHTML).not.toContain('<script');
    expect(svgDiv?.innerHTML).not.toContain('<foreignObject');
    expect(svgDiv?.innerHTML).not.toContain('<use');
    expect(svgDiv?.innerHTML).not.toContain('<iframe');
    expect(svgDiv?.innerHTML).not.toContain('onclick');
    expect(svgDiv?.innerHTML).not.toContain('onload');
    expect(svgDiv?.innerHTML).not.toContain('ev:onclick');
    expect(svgDiv?.innerHTML).not.toContain('javascript:');
    expect(svgDiv?.innerHTML).not.toContain('data:');
    expect(svgDiv?.innerHTML).not.toContain('alert');
    
    // But safe elements should remain
    expect(svgDiv?.innerHTML).toContain('<rect');
    expect(svgDiv?.innerHTML).toContain('<path');
    expect(svgDiv?.innerHTML).toContain('fill="blue"');
  });
});