import {
  parseInlineStyles,
  parseRichText,
  isRichText,
  stripRichText,
  HEADING_SIZE_MULTIPLIERS,
} from '../parser';

describe('parseInlineStyles', () => {
  it('should parse plain text as a single segment', () => {
    const result = parseInlineStyles('Hello World');
    expect(result).toEqual([{ content: 'Hello World' }]);
  });

  it('should parse bold text with **', () => {
    const result = parseInlineStyles('Hello **World**');
    expect(result).toEqual([
      { content: 'Hello ' },
      { content: 'World', bold: true },
    ]);
  });

  it('should parse bold text with __', () => {
    const result = parseInlineStyles('Hello __World__');
    expect(result).toEqual([
      { content: 'Hello ' },
      { content: 'World', bold: true },
    ]);
  });

  it('should parse italic text with *', () => {
    const result = parseInlineStyles('Hello *World*');
    expect(result).toEqual([
      { content: 'Hello ' },
      { content: 'World', italic: true },
    ]);
  });

  it('should parse text color', () => {
    const result = parseInlineStyles('Hello {#FF0000}Red{/} World');
    expect(result).toEqual([
      { content: 'Hello ' },
      { content: 'Red', color: '#FF0000' },
      { content: ' World' },
    ]);
  });

  it('should parse background color (marker)', () => {
    const result = parseInlineStyles('Hello {bg:#FFFF00}Highlight{/bg} World');
    expect(result).toEqual([
      { content: 'Hello ' },
      { content: 'Highlight', backgroundColor: '#FFFF00' },
      { content: ' World' },
    ]);
  });

  it('should parse multiple styles', () => {
    const result = parseInlineStyles('**Bold** and *italic* and {#FF0000}red{/}');
    expect(result.length).toBeGreaterThan(1);
    expect(result.some((s) => s.bold)).toBe(true);
    expect(result.some((s) => s.italic)).toBe(true);
    expect(result.some((s) => s.color === '#FF0000')).toBe(true);
  });

  it('should parse inline code', () => {
    const result = parseInlineStyles('Use `console.log()` for debugging');
    expect(result).toEqual([
      { content: 'Use ' },
      { content: 'console.log()', code: true },
      { content: ' for debugging' },
    ]);
  });

  it('should not parse other styles inside inline code', () => {
    const result = parseInlineStyles('Code: `**not bold**`');
    expect(result).toEqual([
      { content: 'Code: ' },
      { content: '**not bold**', code: true },
    ]);
  });
});

describe('parseRichText', () => {
  it('should parse heading level 1', () => {
    const result = parseRichText('# Heading 1');
    expect(result).toEqual([
      {
        type: 'heading',
        level: 1,
        lines: [{ segments: [{ content: 'Heading 1' }], heightInMm: 0 }],
      },
    ]);
  });

  it('should parse heading level 6', () => {
    const result = parseRichText('###### Heading 6');
    expect(result).toEqual([
      {
        type: 'heading',
        level: 6,
        lines: [{ segments: [{ content: 'Heading 6' }], heightInMm: 0 }],
      },
    ]);
  });

  it('should parse paragraph', () => {
    const result = parseRichText('This is a paragraph');
    expect(result).toEqual([
      {
        type: 'paragraph',
        lines: [{ segments: [{ content: 'This is a paragraph' }], heightInMm: 0 }],
        rawText: 'This is a paragraph',
      },
    ]);
  });

  it('should parse heading with inline styles', () => {
    const result = parseRichText('# **Bold** Heading');
    expect(result[0].type).toBe('heading');
    expect(result[0].level).toBe(1);
    expect(result[0].lines[0].segments.some((s) => s.bold)).toBe(true);
  });

  it('should parse code block', () => {
    const result = parseRichText('```js\nconst x = 1;\n```');
    expect(result).toEqual([
      {
        type: 'code',
        language: 'js',
        lines: [{ segments: [{ content: 'const x = 1;\n' }], heightInMm: 0 }],
      },
    ]);
  });

  it('should parse code block without language', () => {
    const result = parseRichText('```\ncode here\n```');
    expect(result[0].type).toBe('code');
    expect(result[0].language).toBeUndefined();
  });

  it('should parse blockquote', () => {
    const result = parseRichText('> This is a quote');
    expect(result).toEqual([
      {
        type: 'blockquote',
        lines: [{ segments: [{ content: 'This is a quote' }], heightInMm: 0 }],
      },
    ]);
  });

  it('should parse multi-line blockquote', () => {
    const result = parseRichText('> Line 1\n> Line 2');
    expect(result[0].type).toBe('blockquote');
    expect(result[0].lines[0].segments[0].content).toContain('Line 1');
    expect(result[0].lines[0].segments[0].content).toContain('Line 2');
  });

  it('should parse mixed content', () => {
    const result = parseRichText('# Heading\n\nParagraph\n\n```\ncode\n```\n\n> Quote');
    expect(result.length).toBe(4);
    expect(result[0].type).toBe('heading');
    expect(result[1].type).toBe('paragraph');
    expect(result[2].type).toBe('code');
    expect(result[3].type).toBe('blockquote');
  });
});

describe('isRichText', () => {
  it('should return true for headings', () => {
    expect(isRichText('# Heading')).toBe(true);
    expect(isRichText('## Heading')).toBe(true);
  });

  it('should return true for bold text', () => {
    expect(isRichText('**bold**')).toBe(true);
    expect(isRichText('__bold__')).toBe(true);
  });

  it('should return true for italic text', () => {
    expect(isRichText('*italic*')).toBe(true);
    expect(isRichText('_italic_')).toBe(true);
  });

  it('should return true for color text', () => {
    expect(isRichText('{#FF0000}red{/}')).toBe(true);
  });

  it('should return true for background color', () => {
    expect(isRichText('{bg:#FFFF00}highlight{/bg}')).toBe(true);
  });

  it('should return true for inline code', () => {
    expect(isRichText('Use `code` here')).toBe(true);
  });

  it('should return true for code block', () => {
    expect(isRichText('```\ncode\n```')).toBe(true);
  });

  it('should return true for blockquote', () => {
    expect(isRichText('> quote')).toBe(true);
  });

  it('should return false for plain text', () => {
    expect(isRichText('Hello World')).toBe(false);
    expect(isRichText('Just a normal paragraph')).toBe(false);
  });
});

describe('stripRichText', () => {
  it('should remove heading markers', () => {
    expect(stripRichText('# Heading')).toBe('Heading');
    expect(stripRichText('## Heading')).toBe('Heading');
  });

  it('should remove bold markers', () => {
    expect(stripRichText('**bold**')).toBe('bold');
    expect(stripRichText('__bold__')).toBe('bold');
  });

  it('should remove color markers', () => {
    expect(stripRichText('{#FF0000}red{/}')).toBe('red');
  });

  it('should remove background color markers', () => {
    expect(stripRichText('{bg:#FFFF00}highlight{/bg}')).toBe('highlight');
  });

  it('should remove inline code markers', () => {
    expect(stripRichText('Use `code` here')).toBe('Use code here');
  });

  it('should remove code block markers', () => {
    expect(stripRichText('```js\ncode\n```')).toBe('code\n');
  });

  it('should remove blockquote markers', () => {
    expect(stripRichText('> quote')).toBe('quote');
    expect(stripRichText('> Line 1\n> Line 2')).toBe('Line 1\nLine 2');
  });

  it('should handle complex text', () => {
    const input = '# **Bold** Heading with {#FF0000}color{/}';
    const result = stripRichText(input);
    expect(result).not.toContain('**');
    expect(result).not.toContain('{#');
    expect(result).not.toContain('{/}');
  });
});

describe('HEADING_SIZE_MULTIPLIERS', () => {
  it('should have correct multipliers', () => {
    expect(HEADING_SIZE_MULTIPLIERS[1]).toBe(2.0);
    expect(HEADING_SIZE_MULTIPLIERS[2]).toBe(1.5);
    expect(HEADING_SIZE_MULTIPLIERS[3]).toBe(1.25);
    expect(HEADING_SIZE_MULTIPLIERS[4]).toBe(1.0);
    expect(HEADING_SIZE_MULTIPLIERS[5]).toBe(0.875);
    expect(HEADING_SIZE_MULTIPLIERS[6]).toBe(0.75);
  });
});
