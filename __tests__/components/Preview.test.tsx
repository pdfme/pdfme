/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Preview from '../../src/components/Preview';
import { I18nContext, FontContext } from '../../src/libs/contexts';
import { curriedI18n } from '../../src/libs/i18n';
import { getDefaultFont } from '../../src/libs/helper';
import { SELECTABLE_CLASSNAME } from '../../src/libs/constants';
import { setupUiMock, getSampleTemplate } from '../assets/helper';

test('Preview(as Viewer) snapshot', async () => {
  setupUiMock();
  let container: HTMLElement = document.createElement('a');
  act(() => {
    const { container: c } = render(
      <I18nContext.Provider value={curriedI18n('en')}>
        <FontContext.Provider value={getDefaultFont()}>
          <Preview
            template={getSampleTemplate()}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
          />
        </FontContext.Provider>
      </I18nContext.Provider>
    );
    container = c;
  });

  await waitFor(() => Boolean(container?.getElementsByClassName(SELECTABLE_CLASSNAME)));
  expect(container.firstChild).toMatchSnapshot();
});

test('Preview(as Form) snapshot', async () => {
  setupUiMock();
  let container: HTMLElement = document.createElement('a');
  act(() => {
    const { container: c } = render(
      <I18nContext.Provider value={curriedI18n('en')}>
        <FontContext.Provider value={getDefaultFont()}>
          <Preview
            template={getSampleTemplate()}
            inputs={[{ field1: 'field1', field2: 'field2' }]}
            size={{ width: 1200, height: 1200 }}
            onChangeInput={console.log}
          />
        </FontContext.Provider>
      </I18nContext.Provider>
    );
    container = c;
  });

  await waitFor(() => Boolean(container?.getElementsByClassName(SELECTABLE_CLASSNAME)));
  expect(container.firstChild).toMatchSnapshot();
});
