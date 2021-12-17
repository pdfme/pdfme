/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Divider from '../../src/components/Divider';

test('renders a message', () => {
  const { container } = render(<Divider />);
  expect(container.firstChild).toMatchSnapshot();
});
