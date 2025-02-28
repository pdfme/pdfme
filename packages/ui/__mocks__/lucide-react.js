// Mock for lucide-react
const icons = {
  Plus: () => 'Plus',
  Minus: () => 'Minus',
  ChevronLeft: () => 'ChevronLeft',
  ChevronRight: () => 'ChevronRight',
  ChevronsLeft: () => 'ChevronsLeft',
  ChevronsRight: () => 'ChevronsRight',
  Ellipsis: () => 'Ellipsis',
  X: () => 'X',
  Menu: () => 'Menu',
  GripVertical: () => 'GripVertical',
  CircleAlert: () => 'CircleAlert',
  Lock: () => 'Lock',
  ArrowLeft: () => 'ArrowLeft',
  ArrowRight: () => 'ArrowRight',
  LoaderCircle: () => 'LoaderCircle',
  // Add any other icons used in the codebase
};

// Export each icon individually to match the ES Module pattern
export const {
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  X,
  Menu,
  GripVertical,
  CircleAlert,
  Lock,
  ArrowLeft,
  ArrowRight,
  LoaderCircle
} = icons;

// Default export for compatibility
export default icons;
