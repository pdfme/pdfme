# Migration Guide

## Overview

This guide helps you upgrade between different versions of pdfme. Each section covers the changes and steps needed to migrate your code.

## Version 5.0.0

### Breaking Changes

1. **Template Format**
   - Added `pdfmeVersion` field (required)
   - Changed schema position format
   - Updated font configuration structure

```diff
{
+ pdfmeVersion: "5.0.0",
  schemas: [
    [
      {
        name: "text1",
-       x: 0,
-       y: 0,
+       position: { x: 0, y: 0 },
        width: 100,
        height: 20
      }
    ]
  ]
}
```

2. **Font Configuration**
   - New font registration format
   - Added fallback font support
   - Changed font loading mechanism

```diff
- const font = { data: fontBuffer };
+ const font = {
+   custom_font: {
+     data: fontBuffer,
+     fallback: true
+   }
+ };
```

3. **API Changes**
   - Removed deprecated methods
   - Updated plugin interface
   - Changed event handling

### Upgrade Steps

1. **Update Dependencies**
```bash
npm install @pdfme/generator@5.0.0 @pdfme/ui@5.0.0 @pdfme/common@5.0.0
```

2. **Update Templates**
```ts
// Use template converter
import { convertTemplate } from '@pdfme/common';
const newTemplate = convertTemplate(oldTemplate, '5.0.0');
```

3. **Update Font Configuration**
```ts
// New font configuration
const font = {
  primary: {
    data: primaryFontBuffer
  },
  fallback: {
    data: fallbackFontBuffer,
    fallback: true
  }
};
```

### Deprecations

The following features are deprecated and will be removed in version 6.0.0:
- Old template format without `pdfmeVersion`
- Direct font buffer assignment
- Legacy plugin format

## Version 4.0.0

### Breaking Changes

1. **Package Structure**
   - Split into multiple packages
   - New import paths
   - Updated type definitions

2. **Feature Changes**
   - Added table support
   - New expression syntax
   - Enhanced plugin system

### Upgrade Steps

1. **Update Package Imports**
```diff
- import { generate } from 'pdfme';
+ import { generate } from '@pdfme/generator';
+ import { Template } from '@pdfme/common';
```

2. **Update Table Usage**
```ts
// New table format
const template = {
  schemas: [[{
    type: 'table',
    name: 'table1',
    head: ['Name', 'Age'],
    content: '[["John", "30"]]'
  }]]
};
```

## Best Practices

- Test thoroughly after upgrading
- Update one major version at a time
- Keep backups of templates
- Review deprecation warnings
