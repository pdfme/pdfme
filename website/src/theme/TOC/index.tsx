import React, { useEffect } from "react";
import TOC from '@theme-original/TOC';
import type TOCType from '@theme/TOC';
import type { WrapperProps } from '@docusaurus/types';

declare global {
  interface Window {
    ethicalads?: {
      load: () => void;
      wait?: Promise<any>;
    };
  }
}

type Props = WrapperProps<typeof TOCType>;

export default function TOCWrapper(props: Props): JSX.Element {

  useEffect(() => {
    if (window.ethicalads && typeof window.ethicalads.load === "function") {
      window.ethicalads.load();
    } else {
      console.warn("EthicalAds script is not loaded yet.");
    }
  }, []);



  return (
    <div style={{ position: 'sticky', top: 76 }}>
      <TOC {...props} className="custom-toc" />
      <div
        data-ea-publisher="pdfmecom"
        data-ea-type="image"
      />
    </div>
  );
}
