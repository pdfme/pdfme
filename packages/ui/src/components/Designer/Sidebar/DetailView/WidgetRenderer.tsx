import React, { useEffect, useRef } from 'react';
import type { PropPanelWidgetProps } from '@pdfme/common';

type Props = Omit<PropPanelWidgetProps, 'rootElement'> & {
    widget: (props: Omit<PropPanelWidgetProps, 'widget'>) => void
}

const WidgetRenderer = (props: Props) => {
    const { widget, ...otherProps } = props;
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = '';
            widget({ ...otherProps, rootElement: ref.current })
        }

        return () => {
            if (ref.current) {
                ref.current.innerHTML = '';
            }
        };
    }, [props.activeSchema]);


    return <div ref={ref} />
};

export default WidgetRenderer;