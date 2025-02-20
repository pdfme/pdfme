# Troubleshooting

## Overview

This guide helps you resolve common issues encountered while using pdfme. If you can't find a solution to your problem, please check our [GitHub Issues](https://github.com/pdfme/pdfme/issues) or join our [Discord community](https://discord.gg/xWPTJbmgNV).

## Common Issues

### Template Related

#### Template Not Rendering Correctly
- Ensure template schema follows the correct format
- Check if all required properties are set
- Verify position and size values are within page bounds

```ts
// Correct template format
const template = {
  basePdf: BLANK_PDF,
  schemas: [
    [
      {
        name: 'text1',
        type: 'text',
        position: { x: 0, y: 0 },
        width: 100,
        height: 20
      }
    ]
  ]
};
```

#### Page Breaks Not Working
- Ensure `basePdf` is specified with dimensions
- Check table content fits within page bounds
- Verify padding settings are correct

### Font Related

#### Custom Fonts Not Loading
- Check font file URL is accessible
- Ensure font format is supported (TTF, OTF)
- Verify font registration in options

```ts
// Correct font registration
const font = {
  custom_font: {
    data: 'https://example.com/fonts/custom.ttf',
    fallback: true
  }
};
```

#### Japanese/Chinese Characters Show as Tofu
- Install appropriate CJK font
- Register font with correct encoding
- Set font as fallback if needed

### Performance Related

#### Slow PDF Generation
- Reduce number of elements per page
- Use image optimization
- Enable schema caching where possible

#### Memory Issues
- Split large documents into smaller chunks
- Use pagination for large tables
- Monitor memory usage with dev tools

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid schema type` | Schema not registered | Register plugin before use |
| `Font not found` | Font missing or invalid URL | Check font registration |
| `Page overflow` | Content exceeds page bounds | Adjust content or use page breaks |
| `Invalid template format` | Malformed template JSON | Validate template structure |

## Best Practices

1. **Template Design**
   - Use Designer UI for visual template creation
   - Test with sample data before production
   - Keep schemas organized and named clearly

2. **Font Management**
   - Pre-load and cache fonts when possible
   - Use web-safe fonts for better performance
   - Include fallback fonts for reliability

3. **Performance Optimization**
   - Minimize number of elements per page
   - Use appropriate image formats and sizes
   - Enable caching for repeated elements
