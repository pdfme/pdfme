import OriginalDocSidebar from "@theme-original/DocSidebar";
import type DocSidebarType from '@theme/DocSidebar';
import type { WrapperProps } from '@docusaurus/types';
import React, { useEffect } from "react";

declare global {
  interface Window {
    ethicalads?: {
      load: () => void;
      wait?: Promise<any>;
    };
  }
}

type Props = WrapperProps<typeof DocSidebarType>;

export default function DocSidebar(props: Props) {
  useEffect(() => {
    if (window.ethicalads && typeof window.ethicalads.load === "function") {
      window.ethicalads.load();
    } else {
      console.warn("EthicalAds script is not loaded yet.");
    }
  }, []);

  return (
    <span>
      <OriginalDocSidebar {...props} />
      <div
        data-ea-publisher="pdfmecom"
        data-ea-type="image"
        style={{
          position: 'absolute',
          bottom: '0',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      ></div>
    </span>
  );
}
