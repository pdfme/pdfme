import type { TextSegment, TextBlock, HeadingLevel, ListItem, TableData } from '../types.js';

export const HEADING_SIZE_MULTIPLIERS: Record<HeadingLevel, number> = {
  1: 2.0,
  2: 1.5,
  3: 1.25,
  4: 1.0,
  5: 0.875,
  6: 0.75,
};

const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const CODE_BLOCK_PATTERN = /^```(\w*)\n?([\s\S]*?)```$/;
const BLOCKQUOTE_PATTERN = /^>\s?(.*)$/;
const TABLE_ROW_PATTERN = /^\|(.+)\|$/;
const TABLE_SEPARATOR_PATTERN = /^\|[\s\-:|]+\|$/;
const UNORDERED_LIST_PATTERN = /^(\s*)[-*]\s+(.*)$/;
const ORDERED_LIST_PATTERN = /^(\s*)(\d+)\.\s+(.*)$/;

const INLINE_PATTERNS = {
  bold: /(\*\*|__)(.*?)\1/g,
  italic: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g,
  color: /\{#([0-9A-Fa-f]{6})\}(.*?)\{\/\}/g,
  backgroundColor: /\{bg:#([0-9A-Fa-f]{6})\}(.*?)\{\/bg\}/g,
};

type TokenType = 'text' | 'bold' | 'italic' | 'code' | 'color' | 'backgroundColor';

interface Token {
  type: TokenType;
  content: string;
  value?: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  let match: RegExpExecArray | null;

  const codePattern = /`([^`]+)`/g;
  while ((match = codePattern.exec(text)) !== null) {
    tokens.push({
      type: 'code',
      content: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  const boldPattern = /(\*\*|__)(.*?)\1/g;
  while ((match = boldPattern.exec(text)) !== null) {
    const overlapsCode = tokens.some(
      (t) => t.type === 'code' && match!.index >= t.start && match!.index < t.end,
    );
    if (!overlapsCode) {
      tokens.push({
        type: 'bold',
        content: match[2],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  const italicPattern = /(?<!\*)\*(?!\*)((?:(?!\*).)+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)((?:(?!_).)+?)(?<!_)_(?!_)/g;
  while ((match = italicPattern.exec(text)) !== null) {
    const overlaps = tokens.some(
      (t) => (t.type === 'bold' || t.type === 'code') && match!.index >= t.start && match!.index < t.end,
    );
    if (!overlaps) {
      tokens.push({
        type: 'italic',
        content: match[1] || match[2],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  const colorPattern = /\{#([0-9A-Fa-f]{6})\}(.*?)\{\/\}/g;
  while ((match = colorPattern.exec(text)) !== null) {
    const overlapsCode = tokens.some(
      (t) => t.type === 'code' && match!.index >= t.start && match!.index < t.end,
    );
    if (!overlapsCode) {
      tokens.push({
        type: 'color',
        content: match[2],
        value: `#${match[1]}`,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  const bgPattern = /\{bg:#([0-9A-Fa-f]{6})\}(.*?)\{\/bg\}/g;
  while ((match = bgPattern.exec(text)) !== null) {
    const overlapsCode = tokens.some(
      (t) => t.type === 'code' && match!.index >= t.start && match!.index < t.end,
    );
    if (!overlapsCode) {
      tokens.push({
        type: 'backgroundColor',
        content: match[2],
        value: `#${match[1]}`,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  tokens.sort((a, b) => a.start - b.start);

  return tokens;
}

function tokensToSegments(text: string, tokens: Token[]): TextSegment[] {
  if (tokens.length === 0) {
    return [{ content: text }];
  }

  const segments: TextSegment[] = [];
  let currentPos = 0;

  for (const token of tokens) {
    if (token.start > currentPos) {
      const plainText = text.slice(currentPos, token.start);
      if (plainText) {
        segments.push({ content: plainText });
      }
    }

    const nestedTokens = tokens.filter(
      (t) => t !== token && t.start >= token.start && t.end <= token.end,
    );

    if (nestedTokens.length > 0) {
      const nestedSegments = tokensToSegments(token.content, nestedTokens.map((t) => ({
        ...t,
        start: t.start - token.start - getMarkerLength(token),
        end: t.end - token.start - getMarkerLength(token),
      })));

      for (const seg of nestedSegments) {
        const segment: TextSegment = { ...seg };
        applyTokenStyle(segment, token);
        segments.push(segment);
      }
    } else {
      const segment: TextSegment = { content: token.content };
      applyTokenStyle(segment, token);
      segments.push(segment);
    }

    currentPos = token.end;
  }

  if (currentPos < text.length) {
    const plainText = text.slice(currentPos);
    if (plainText) {
      segments.push({ content: plainText });
    }
  }

  return segments;
}

function getMarkerLength(token: Token): number {
  switch (token.type) {
    case 'bold':
      return 2;
    case 'italic':
      return 1;
    case 'code':
      return 1;
    case 'color':
      return 10;
    case 'backgroundColor':
      return 13;
    default:
      return 0;
  }
}

function applyTokenStyle(segment: TextSegment, token: Token): void {
  switch (token.type) {
    case 'bold':
      segment.bold = true;
      break;
    case 'italic':
      segment.italic = true;
      break;
    case 'code':
      segment.code = true;
      break;
    case 'color':
      segment.color = token.value;
      break;
    case 'backgroundColor':
      segment.backgroundColor = token.value;
      break;
  }
}

export function parseInlineStyles(text: string): TextSegment[] {
  const tokens = tokenize(text);
  return tokensToSegments(text, tokens);
}

export function parseRichText(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];

  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      blocks.push(...parseNonCodeBlocks(beforeText));
    }

    const language = match[1] || undefined;
    const codeContent = match[2];
    blocks.push({
      type: 'code',
      language,
      lines: [{ segments: [{ content: codeContent }], heightInMm: 0 }],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    blocks.push(...parseNonCodeBlocks(remainingText));
  }

  return blocks;
}

function parseTableBlock(lines: string[]): { block: TextBlock; consumedLines: number } | null {
  if (lines.length < 2) return null;

  const firstLine = lines[0].trim();
  const secondLine = lines[1].trim();

  if (!TABLE_ROW_PATTERN.test(firstLine) || !TABLE_SEPARATOR_PATTERN.test(secondLine)) {
    return null;
  }

  const headerCells = firstLine
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());

  const rows: string[][] = [];
  let i = 2;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!TABLE_ROW_PATTERN.test(line)) break;

    const cells = line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());
    rows.push(cells);
    i++;
  }

  const tableData: TableData = {
    headers: headerCells,
    rows,
  };

  return {
    block: {
      type: 'table',
      lines: [],
      tableData,
    },
    consumedLines: i,
  };
}

function parseListBlock(lines: string[]): { block: TextBlock; consumedLines: number } | null {
  const listItems: ListItem[] = [];
  let i = 0;

  const orderCounters: Map<number, number> = new Map();

  while (i < lines.length) {
    const line = lines[i];

    const unorderedMatch = UNORDERED_LIST_PATTERN.exec(line);
    if (unorderedMatch) {
      const indent = unorderedMatch[1].length;
      const level = Math.floor(indent / 2);
      const content = unorderedMatch[2];
      const segments = parseInlineStyles(content);

      listItems.push({
        level,
        ordered: false,
        segments,
      });
      i++;
      continue;
    }

    const orderedMatch = ORDERED_LIST_PATTERN.exec(line);
    if (orderedMatch) {
      const indent = orderedMatch[1].length;
      const level = Math.floor(indent / 2);
      const content = orderedMatch[3];
      const segments = parseInlineStyles(content);

      const currentCount = (orderCounters.get(level) || 0) + 1;
      orderCounters.set(level, currentCount);

      for (const [key] of orderCounters) {
        if (key > level) {
          orderCounters.delete(key);
        }
      }

      listItems.push({
        level,
        ordered: true,
        orderNumber: currentCount,
        segments,
      });
      i++;
      continue;
    }

    if (line.trim() === '' && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (UNORDERED_LIST_PATTERN.test(nextLine) || ORDERED_LIST_PATTERN.test(nextLine)) {
        i++;
        continue;
      }
    }

    break;
  }

  if (listItems.length === 0) {
    return null;
  }

  return {
    block: {
      type: 'list',
      lines: [],
      listItems,
    },
    consumedLines: i,
  };
}

function isListLine(line: string): boolean {
  return UNORDERED_LIST_PATTERN.test(line) || ORDERED_LIST_PATTERN.test(line);
}

function isTableLine(line: string): boolean {
  return TABLE_ROW_PATTERN.test(line.trim());
}

function parseNonCodeBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const allLines = text.split('\n');
  let i = 0;

  while (i < allLines.length) {
    const line = allLines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length as HeadingLevel;
      const content = headingMatch[2];
      const segments = parseInlineStyles(content);

      blocks.push({
        type: 'heading',
        level,
        lines: [{ segments, heightInMm: 0 }],
      });
      i++;
      continue;
    }

    const tableResult = parseTableBlock(allLines.slice(i));
    if (tableResult) {
      blocks.push(tableResult.block);
      i += tableResult.consumedLines;
      continue;
    }

    if (isListLine(line)) {
      const listResult = parseListBlock(allLines.slice(i));
      if (listResult) {
        blocks.push(listResult.block);
        i += listResult.consumedLines;
        continue;
      }
    }

    if (BLOCKQUOTE_PATTERN.test(line)) {
      const quoteLines: string[] = [];
      while (i < allLines.length) {
        const currentLine = allLines[i];
        if (BLOCKQUOTE_PATTERN.test(currentLine)) {
          const match = BLOCKQUOTE_PATTERN.exec(currentLine);
          quoteLines.push(match ? match[1] : '');
          i++;
        } else if (currentLine.trim() === '') {
          break;
        } else {
          break;
        }
      }
      const segments = parseInlineStyles(quoteLines.join('\n'));
      blocks.push({
        type: 'blockquote',
        lines: [{ segments, heightInMm: 0 }],
      });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < allLines.length) {
      const currentLine = allLines[i];

      if (currentLine.trim() === '') {
        break;
      }

      if (
        HEADING_PATTERN.test(currentLine) ||
        isListLine(currentLine) ||
        isTableLine(currentLine) ||
        BLOCKQUOTE_PATTERN.test(currentLine)
      ) {
        break;
      }

      paragraphLines.push(currentLine);
      i++;
    }

    if (paragraphLines.length > 0) {
      const paragraphText = paragraphLines.join('\n');
      const segments = parseInlineStyles(paragraphText);
      blocks.push({
        type: 'paragraph',
        lines: [{ segments, heightInMm: 0 }],
        rawText: paragraphText,
      });
    }
  }

  return blocks;
}

export function isRichText(text: string): boolean {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (HEADING_PATTERN.test(line)) return true;
    if (BLOCKQUOTE_PATTERN.test(line)) return true;
    if (UNORDERED_LIST_PATTERN.test(line)) return true;
    if (ORDERED_LIST_PATTERN.test(line)) return true;

    if (i < lines.length - 1) {
      if (TABLE_ROW_PATTERN.test(line.trim()) && TABLE_SEPARATOR_PATTERN.test(lines[i + 1].trim())) {
        return true;
      }
    }
  }

  if (/```[\s\S]*?```/.test(text)) return true;
  if (/`[^`]+`/.test(text)) return true;
  if (/\*\*.+?\*\*/.test(text)) return true;
  if (/__[^_]+__/.test(text)) return true;
  if (/(?<!\*)\*(?!\*)[^*]+\*(?!\*)/.test(text)) return true;
  if (/(?<!_)_(?!_)[^_]+_(?!_)/.test(text)) return true;
  if (/\{#[0-9A-Fa-f]{6}\}.+?\{\/\}/.test(text)) return true;
  if (/\{bg:#[0-9A-Fa-f]{6}\}.+?\{\/bg\}/.test(text)) return true;

  return false;
}

export function stripRichText(text: string): string {
  let result = text;

  result = result.replace(/```\w*\n?([\s\S]*?)```/g, '$1');
  result = result.replace(/`([^`]+)`/g, '$1');
  result = result.replace(/^#{1,6}\s+/gm, '');
  result = result.replace(/^>\s?/gm, '');
  result = result.replace(/^\|[\s\-:|]+\|$/gm, '');
  result = result.replace(/^\|(.+)\|$/gm, (_, content) => {
    return content.split('|').map((cell: string) => cell.trim()).join(' ');
  });
  result = result.replace(/^(\s*)[-*]\s+/gm, '$1');
  result = result.replace(/^(\s*)\d+\.\s+/gm, '$1');
  result = result.replace(/(\*\*|__)(.*?)\1/g, '$2');
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');
  result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1');
  result = result.replace(/\{#[0-9A-Fa-f]{6}\}(.*?)\{\/\}/g, '$1');
  result = result.replace(/\{bg:#[0-9A-Fa-f]{6}\}(.*?)\{\/bg\}/g, '$1');

  return result;
}
