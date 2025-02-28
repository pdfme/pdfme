// Mock for lucide-react
// Create a factory function for icon components to ensure consistent behavior
const createIconComponent = (name) => {
  const IconComponent = () => name;
  IconComponent.displayName = name;
  return IconComponent;
};

// Define all icons used in the codebase
const icons = {
  Plus: createIconComponent('Plus'),
  Minus: createIconComponent('Minus'),
  ChevronLeft: createIconComponent('ChevronLeft'),
  ChevronRight: createIconComponent('ChevronRight'),
  ChevronsLeft: createIconComponent('ChevronsLeft'),
  ChevronsRight: createIconComponent('ChevronsRight'),
  Ellipsis: createIconComponent('Ellipsis'),
  X: createIconComponent('X'),
  Menu: createIconComponent('Menu'),
  GripVertical: createIconComponent('GripVertical'),
  CircleAlert: createIconComponent('CircleAlert'),
  Lock: createIconComponent('Lock'),
  ArrowLeft: createIconComponent('ArrowLeft'),
  ArrowRight: createIconComponent('ArrowRight'),
  LoaderCircle: createIconComponent('LoaderCircle'),
  // Add any other icons used in the codebase
  AlignLeft: createIconComponent('AlignLeft'),
  AlignCenter: createIconComponent('AlignCenter'),
  AlignRight: createIconComponent('AlignRight'),
  AlignJustify: createIconComponent('AlignJustify'),
  Bold: createIconComponent('Bold'),
  Italic: createIconComponent('Italic'),
  Underline: createIconComponent('Underline'),
  Copy: createIconComponent('Copy'),
  Trash: createIconComponent('Trash')
};

// Support for CommonJS
module.exports = {
  ...icons,
  default: icons,
  __esModule: true // This helps bundlers recognize this as an ES module
};
