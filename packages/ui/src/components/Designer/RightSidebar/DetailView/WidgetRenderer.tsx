import React, { useEffect, useRef } from 'react';
import type { PropPanelWidgetProps } from '@pdfme/common';

type Props = PropPanelWidgetProps & {
  widget: (props: PropPanelWidgetProps) => void;
};

const WidgetRenderer = (props: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) {
      const { widget, ...otherProps } = props;
      element.innerHTML = '';
      widget({ ...otherProps, rootElement: element });
    }

    return () => {
      if (element) {
        element.innerHTML = '';
      }
    };
  }, [props]);

  return <div ref={ref} />;
};

export default WidgetRenderer;
