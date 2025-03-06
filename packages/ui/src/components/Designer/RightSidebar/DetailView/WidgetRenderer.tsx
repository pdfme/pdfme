import React, { useEffect, useRef } from 'react';
import type { PropPanelWidgetProps } from '@pdfme/common';

type Props = PropPanelWidgetProps & {
  widget: (props: PropPanelWidgetProps) => void;
};

const WidgetRenderer = (props: Props) => {
  const { widget, ...otherProps } = props;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (currentRef) {
      currentRef.innerHTML = '';
      widget({ ...otherProps, rootElement: currentRef });
    }

    return () => {
      if (currentRef) {
        currentRef.innerHTML = '';
      }
    };
  }, [props.activeSchema, widget, otherProps]);

  return <div ref={ref} />;
};

export default WidgetRenderer;
