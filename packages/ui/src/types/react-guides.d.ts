declare module '@scena/react-guides' {
  import { ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface GuidesInterface {
    getGuides(): number[];
    scroll(pos: number): void;
    scrollGuides(pos: number): void;
    loadGuides(guides: number[]): void;
    resize(): void;
  }

  export interface GuidesProps {
    zoom?: number;
    style?: React.CSSProperties;
    type?: 'horizontal' | 'vertical';
    className?: string;
    snapThreshold?: number;
    snaps?: number[];
    displayDragPos?: boolean;
    dragPosFormat?: (value: number) => string | number;
    textFormat?: (value: number) => string | number;
  }

  // Define the component as a ForwardRefExoticComponent to support refs
  const GuidesComponent: ForwardRefExoticComponent<GuidesProps & RefAttributes<GuidesInterface>>;
  
  export default GuidesComponent;
}
