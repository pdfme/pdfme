/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Designer from '../../src/components/Designer/index';
import {
  I18nContext, FontContext, RendererRegistry,
  PropPanelRegistry,
} from '../../src/contexts';
import { curriedI18n } from '../../src/i18n';
import { SELECTABLE_CLASSNAME } from '../../src/constants';
import { getDefaultFont } from '@pdfme/common';
import { setupUIMock, getSampleTemplate } from '../assets/helper';
import { text, image } from "@pdfme/schemas"
import type { UIRenderer, UIRender } from '../../src/types';

const renderer: UIRenderer = {
  text: text.ui as UIRender,
  image: image.ui as UIRender
};

const propPanel = {
  text: text.propPanel,
  image: image.propPanel
}

test('Designer snapshot', async () => {
  setupUIMock();
  let container: HTMLElement = document.createElement('a');
  act(() => {
    const { container: c } = render(
      <I18nContext.Provider value={curriedI18n('en')}>
        <FontContext.Provider value={getDefaultFont()}>
          <RendererRegistry.Provider value={renderer}>
            <PropPanelRegistry.Provider value={propPanel}>
              <Designer
                template={getSampleTemplate()}
                onSaveTemplate={console.log}
                onChangeTemplate={console.log}
                size={{ width: 1200, height: 1200 }}
              />
            </PropPanelRegistry.Provider>
          </RendererRegistry.Provider>
        </FontContext.Provider>
      </I18nContext.Provider>
    );
    container = c;
  });

  await waitFor(() => Boolean(container?.getElementsByClassName(SELECTABLE_CLASSNAME)));
  expect(container.firstChild).toMatchSnapshot();
});
