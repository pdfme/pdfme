declare module '@scena/react-guides' {
  import { Component, ForwardRefExoticComponent, RefAttributes } from 'react';

  interface GuidesInterface {
    getGuides(): number[];
    scroll(pos: number): void;
    scrollGuides(pos: number): void;
    loadGuides(guides: number[]): void;
    resize(): void;
  }

  interface GuidesProps {
    zoom?: number;
    style?: React.CSSProperties;
    type?: 'horizontal' | 'vertical';
  }

  // Define the component as a ForwardRefExoticComponent to support refs
  const GuidesComponent: ForwardRefExoticComponent<GuidesProps & RefAttributes<GuidesInterface>>;
  
  export default GuidesComponent;
}
