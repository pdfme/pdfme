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

// Use CommonJS module.exports but structure it to be compatible with ES Module imports
module.exports = {
  ...icons,
  default: icons
};
