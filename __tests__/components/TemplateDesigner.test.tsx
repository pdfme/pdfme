/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TemplateDesigner from '../../src/components/TemplateDesigner';
import { I18nContext, FontContext } from '../../src/libs/contexts';
import { curriedI18n } from '../../src/libs/i18n';
import { getDefaultFont } from '../../src/libs/helper';
import { SELECTABLE_CLASSNAME } from '../../src/libs/constants';
import { setupUiMock, getSampleTemplate } from '../assets/helper';

test('TemplateDesigner snapshot', async () => {
  setupUiMock();
  let container: HTMLElement = document.createElement('a');
  act(() => {
    const { container: c } = render(
      <I18nContext.Provider value={curriedI18n('en')}>
        <FontContext.Provider value={getDefaultFont()}>
          <TemplateDesigner
            template={getSampleTemplate()}
            saveTemplate={console.log}
            onChangeTemplate={console.log}
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
