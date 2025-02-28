// Mock for lucide-react
// This mock supports both CommonJS and ES Module import patterns
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

// Support for named imports (import { X } from 'lucide-react')
// and default import (import LucideIcons from 'lucide-react')
module.exports = {
  ...icons,
  default: icons,
  __esModule: true // This helps some bundlers recognize this as an ES module
};
