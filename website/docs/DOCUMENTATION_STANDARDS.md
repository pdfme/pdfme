# Documentation Standards

## Format and Structure

### File Organization
- All documentation files must be in Markdown format
- File names should be kebab-case (e.g., `getting-started.md`)
- Japanese translations use `.ja.md` suffix (e.g., `getting-started.ja.md`)

### Document Structure
1. **Title (H1)**
   - Single H1 per document
   - Clear and concise

2. **Overview Section**
   - Brief introduction
   - Purpose of the document
   - Key concepts

3. **Main Content**
   - Logical progression from basic to advanced
   - Clear headings (H2, H3)
   - Code examples where applicable

4. **Related Topics**
   - Links to related documentation
   - Next steps

### Markdown Guidelines
- Use ATX-style headers (`#` instead of `===`)
- Code blocks must specify language
- Use backticks for inline code
- Include alt text for images
- Use relative links for internal references

### Code Examples
- Must be complete and runnable
- Include comments for complex operations
- Show both basic and advanced usage
- Include error handling where appropriate

## Content Guidelines

### Writing Style
- Clear and concise
- Present tense
- Active voice
- Technical terms in English
- Japanese explanations for complex concepts

### Code Blocks
```ts
// Good
import { Template } from '@pdfme/common';
const template: Template = {
  // ...
};

// Bad (missing type, no comments)
const template = {
  // ...
};
```

### Visual Aids
- Diagrams for complex concepts
- Screenshots for UI components
- Flow charts for processes
- Tables for comparing options

## Quality Metrics

### Required Elements
- [ ] Overview section
- [ ] Basic usage example
- [ ] Error handling section
- [ ] Related documentation links
- [ ] Version compatibility info

### Validation
- All internal links must be valid
- Code examples must be tested
- Images must have alt text
- No broken references

## Versioning
- Document version compatibility
- Mark deprecated features
- Include migration guides
- Note breaking changes

## Translation Guidelines
- Technical terms remain in English
- Include Japanese explanations
- Maintain consistent terminology
- Update both versions simultaneously
