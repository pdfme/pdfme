import type { TextSchema, TextSegment } from '../types.js';
import { parseRichText, HEADING_SIZE_MULTIPLIERS } from './index.js';
import {
  CODE_BG_COLOR,
  CODE_BORDER_COLOR,
  CODE_FONT_SIZE_RATIO,
  BLOCKQUOTE_BORDER_COLOR,
  BLOCKQUOTE_TEXT_COLOR,
  BOLD_STROKE_WIDTH_CSS,
  TABLE_BORDER_COLOR,
  TABLE_HEADER_BG_COLOR,
  TABLE_CELL_PADDING,
  LIST_INDENT_PER_LEVEL,
  LIST_BULLET_CHAR,
} from './constants.js';

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const segmentToHtml = (segment: TextSegment, schema: TextSchema): string => {
  const styles: string[] = [];

  if (segment.bold) {
    styles.push(`-webkit-text-stroke: ${BOLD_STROKE_WIDTH_CSS} currentColor`);
    styles.push(`text-stroke: ${BOLD_STROKE_WIDTH_CSS} currentColor`);
  }

  if (segment.italic) {
    styles.push('font-style: italic');
  }

  if (segment.code) {
    styles.push(`background-color: ${CODE_BG_COLOR}`);
    styles.push(`border: 1px solid ${CODE_BORDER_COLOR}`);
    styles.push('border-radius: 6px');
    styles.push('padding: 0.2em 0.4em');
    styles.push(`font-size: ${CODE_FONT_SIZE_RATIO}em`);
    styles.push('font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace');
  }

  if (segment.color) {
    styles.push(`color: ${segment.color}`);
  }

  if (segment.backgroundColor && !segment.code) {
    styles.push(`background-color: ${segment.backgroundColor}`);
    styles.push('padding: 0 2px');
    styles.push('border-radius: 2px');
  }

  const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
  const escapedContent = escapeHtml(segment.content);

  return `<span${styleAttr}>${escapedContent}</span>`;
};

export const richTextToHtml = (text: string, schema: TextSchema): string => {
  const blocks = parseRichText(text);
  const baseFontSize = schema.fontSize ?? 13;

  return blocks.map((block) => {
    switch (block.type) {
      case 'heading': {
        const level = block.level ?? 1;
        const sizeMultiplier = HEADING_SIZE_MULTIPLIERS[level];
        const fontSize = baseFontSize * sizeMultiplier;
        const segments = block.lines[0]?.segments ?? [];
        const content = segments.map((seg) => segmentToHtml(seg, schema)).join('');
        return `<div style="font-size: ${fontSize}pt; -webkit-text-stroke: ${BOLD_STROKE_WIDTH_CSS} currentColor; text-stroke: ${BOLD_STROKE_WIDTH_CSS} currentColor; margin-bottom: 0.3em;">${content}</div>`;
      }

      case 'code': {
        const content = block.lines[0]?.segments[0]?.content ?? '';
        const escapedContent = escapeHtml(content).replace(/\n/g, '<br>');
        return `<div style="background-color: ${CODE_BG_COLOR}; border: 1px solid ${CODE_BORDER_COLOR}; border-radius: 6px; padding: 0.5em 1em; font-size: ${baseFontSize * CODE_FONT_SIZE_RATIO}pt; font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace; white-space: pre-wrap; margin: 0.5em 0;">${escapedContent}</div>`;
      }

      case 'blockquote': {
        const segments = block.lines[0]?.segments ?? [];
        const content = segments.map((seg) => segmentToHtml(seg, schema)).join('');
        return `<div style="border-left: 3px solid ${BLOCKQUOTE_BORDER_COLOR}; padding-left: 1em; color: ${BLOCKQUOTE_TEXT_COLOR}; margin: 0.5em 0;">${content}</div>`;
      }

      case 'table': {
        const tableData = block.tableData;
        if (!tableData) return '';

        const { headers, rows } = tableData;
        const cellStyle = `padding: ${TABLE_CELL_PADDING}px; border: 1px solid ${TABLE_BORDER_COLOR}; text-align: left;`;
        const headerCellStyle = `${cellStyle} background-color: ${TABLE_HEADER_BG_COLOR}; -webkit-text-stroke: ${BOLD_STROKE_WIDTH_CSS} currentColor;`;

        const headerRow = headers
          .map((header) => `<th style="${headerCellStyle}">${escapeHtml(header)}</th>`)
          .join('');

        const dataRows = rows
          .map((row) => {
            const cells = row
              .map((cell) => {
                const parsed = parseRichText(cell);
                const segments = parsed[0]?.lines[0]?.segments ?? [{ content: cell }];
                const cellContent = segments.map((seg) => segmentToHtml(seg, schema)).join('');
                return `<td style="${cellStyle}">${cellContent}</td>`;
              })
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');

        return `<table style="border-collapse: collapse; width: 100%; margin: 0.5em 0;"><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table>`;
      }

      case 'list': {
        const listItems = block.listItems;
        if (!listItems || listItems.length === 0) return '';

        const items = listItems
          .map((item) => {
            const indent = item.level * LIST_INDENT_PER_LEVEL;
            const marker = item.ordered ? `${item.orderNumber ?? 1}.` : LIST_BULLET_CHAR;
            const content = item.segments.map((seg) => segmentToHtml(seg, schema)).join('');
            return `<div style="padding-left: ${indent}px; margin-bottom: 0.2em;"><span style="display: inline-block; width: 15px;">${marker}</span>${content}</div>`;
          })
          .join('');

        return `<div style="margin: 0.5em 0;">${items}</div>`;
      }

      case 'paragraph':
      default: {
        const segments = block.lines[0]?.segments ?? [];
        const content = segments.map((seg) => segmentToHtml(seg, schema)).join('');
        return `<div style="margin-bottom: 0.3em;">${content}</div>`;
      }
    }
  }).join('');
};
