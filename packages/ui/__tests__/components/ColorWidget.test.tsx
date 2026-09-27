import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import ColorWidget from '../../src/components/Designer/RightSidebar/DetailView/ColorWidget';

beforeAll(() => {
  // antd's ColorPicker popover mounts an @rc-component/resize-observer, which
  // jsdom does not implement.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: ResizeObserverStub,
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

const renderColorWidget = (props: React.ComponentProps<typeof ColorWidget> = {}) => {
  const onChange = vi.fn();
  const utils = render(<ColorWidget onChange={onChange} {...props} />);
  const input = utils.container.querySelector<HTMLInputElement>('input:not([type="color"])')!;
  return { ...utils, onChange, input };
};

describe('ColorWidget', () => {
  it('enables the alpha slider by default and hides it when disabledAlpha is set', () => {
    const openPickerAndCountSliders = (disabledAlpha?: boolean) => {
      const { container, unmount } = render(
        <ColorWidget value="#ff0000" disabledAlpha={disabledAlpha} />,
      );
      fireEvent.click(container.querySelector('.ant-color-picker-trigger')!);
      // antd renders a hue slider always and an alpha slider only when alpha is enabled.
      const count = document.querySelectorAll('.ant-color-picker-slider').length;
      unmount();
      document.body.innerHTML = '';
      return count;
    };

    expect(openPickerAndCountSliders()).toBe(2);
    expect(openPickerAndCountSliders(true)).toBe(1);
  });

  it('commits typed 3/4/6/8-digit hex values', () => {
    for (const hex of ['#f00', '#f008', '#ff0000', '#ff000080']) {
      const { onChange, input } = renderColorWidget({ value: '#000000' });
      fireEvent.change(input, { target: { value: hex } });
      expect(onChange).toHaveBeenCalledWith(hex);
    }
  });

  it('does not commit invalid free-text but keeps it in the input', () => {
    const { onChange, input } = renderColorWidget({ value: '#000000' });
    fireEvent.change(input, { target: { value: '#ff0000gg' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('#ff0000gg');
  });

  it('commits undefined when the input is cleared', () => {
    const { onChange, input } = renderColorWidget({ value: '#ff000080' });
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
