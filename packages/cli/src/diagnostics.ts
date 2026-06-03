import { dirname, resolve } from 'node:path';
import { PAGE_SIZE_PRESETS, checkTemplate } from '@pdfme/common';
import { fail } from './contract.js';
import { schemaTypes } from './schema-plugins.js';
import { detectPaperSize, readJsonFile, readJsonFromStdin } from './utils.js';

export const KNOWN_TEMPLATE_KEYS = new Set([
  'author',
  'basePdf',
  'columns',
  'pdfmeVersion',
  'schemas',
]);
export const KNOWN_JOB_KEYS = new Set(['template', 'inputs', 'options']);

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  pages: number;
  fields: number;
}

export interface ValidationInspection {
  schemaTypes: string[];
  requiredPlugins: string[];
  requiredFonts: string[];
  basePdf: {
    kind: string;
    width?: number;
    height?: number;
    paperSize?: string | null;
    path?: string;
    resolvedPath?: string;
  };
}

export interface FieldInputHint {
  name: string;
  type: string;
  pages: number[];
  required: boolean;
  expectedInput: {
    kind: 'string' | 'jsonStringObject' | 'enumString' | 'stringMatrix' | 'stringArray';
    variableNames?: string[];
    allowedValues?: string[];
    example?: string | string[] | string[][];
    format?: string;
    canonicalFormat?: string;
    contentKind?: string;
    rule?: string;
    groupName?: string;
    groupMemberNames?: string[];
    columnCount?: number;
    columnHeaders?: string[];
    acceptsJsonString?: boolean;
  };
}

export interface ValidationSource {
  mode: 'template' | 'job';
  template: Record<string, unknown>;
  inputs?: Record<string, unknown>[];
  options?: unknown;
  templateDir?: string;
  jobWarnings: string[];
}

export function findClosestType(type: string): string | null {
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  for (const known of schemaTypes) {
    const dist = levenshtein(type.toLowerCase(), known.toLowerCase());
    if (dist < bestDist && dist <= 3) {
      bestDist = dist;
      bestMatch = known;
    }
  }
  return bestMatch;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

export function validateTemplate(template: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    checkTemplate(template);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const schemaPages = normalizeSchemaPages(template.schemas);
  if (schemaPages.length === 0) {
    return { errors, warnings, pages: 0, fields: 0 };
  }

  const totalFields = schemaPages.reduce((sum, page) => sum + page.length, 0);
  let pageWidth: number = PAGE_SIZE_PRESETS.A4.width;
  let pageHeight: number = PAGE_SIZE_PRESETS.A4.height;
  if (
    template.basePdf &&
    typeof template.basePdf === 'object' &&
    'width' in (template.basePdf as object)
  ) {
    pageWidth = (template.basePdf as { width: number }).width;
    pageHeight = (template.basePdf as { height: number }).height;
  }

  const allNames = new Map<string, number[]>();

  for (let pageIdx = 0; pageIdx < schemaPages.length; pageIdx++) {
    const page = schemaPages[pageIdx];
    if (!Array.isArray(page)) continue;

    const pageNames = new Set<string>();

    for (const schema of page) {
      if (typeof schema !== 'object' || schema === null) continue;

      const name = schema.name as string;
      const type = schema.type as string;
      const position = schema.position as { x: number; y: number } | undefined;
      const width = schema.width as number | undefined;
      const height = schema.height as number | undefined;

      if (type && !schemaTypes.has(type)) {
        const suggestion = findClosestType(type);
        const hint = suggestion ? ` Did you mean: ${suggestion}?` : '';
        errors.push(
          `Field "${name}" has unknown type "${type}".${hint} Available types: ${[...schemaTypes].join(', ')}`,
        );
      }

      if (name && pageNames.has(name)) {
        errors.push(`Duplicate field name "${name}" on page ${pageIdx + 1}`);
      }

      if (name) {
        pageNames.add(name);
        if (!allNames.has(name)) allNames.set(name, []);
        allNames.get(name)!.push(pageIdx + 1);
      }

      if (position && width !== undefined && height !== undefined) {
        if (position.x + width > pageWidth + 1) {
          warnings.push(
            `Field "${name}" at (${position.x},${position.y}) extends beyond page width (${pageWidth}mm)`,
          );
        }
        if (position.y + height > pageHeight + 1) {
          warnings.push(
            `Field "${name}" at (${position.x},${position.y}) extends beyond page height (${pageHeight}mm)`,
          );
        }
        if (position.x < 0 || position.y < 0) {
          warnings.push(`Field "${name}" has negative position (${position.x},${position.y})`);
        }
      }
    }
  }

  for (const [name, pages] of allNames) {
    if (pages.length > 1) {
      warnings.push(`Field name "${name}" appears on multiple pages: ${pages.join(', ')}`);
    }
  }

  return { errors, warnings, pages: schemaPages.length, fields: totalFields };
}

export function inspectTemplate(
  template: Record<string, unknown>,
  templateDir?: string,
): ValidationInspection {
  const schemaPages = normalizeSchemaPages(template.schemas);
  const flattenedSchemas = schemaPages.flat();
  const collectedSchemaTypes = getUniqueStringValues(flattenedSchemas.map((schema) => schema.type));
  const requiredFonts = getUniqueStringValues(flattenedSchemas.map((schema) => schema.fontName));

  return {
    schemaTypes: collectedSchemaTypes,
    requiredPlugins: collectedSchemaTypes.filter((type) => schemaTypes.has(type)),
    requiredFonts,
    basePdf: summarizeBasePdf(template.basePdf, templateDir),
  };
}

export function collectInputHints(template: Record<string, unknown>): FieldInputHint[] {
  const hintMap = new Map<string, FieldInputHint>();
  const schemaPages = normalizeSchemaPages(template.schemas);
  const radioGroupMembers = collectRadioGroupMembers(schemaPages);

  for (let pageIdx = 0; pageIdx < schemaPages.length; pageIdx++) {
    for (const schema of schemaPages[pageIdx]) {
      const name = typeof schema.name === 'string' ? schema.name : '';
      const type = typeof schema.type === 'string' ? schema.type : '';
      const readOnly = schema.readOnly === true;

      if (!name || !type || readOnly) {
        continue;
      }

      const hint = buildFieldInputHint(schema, pageIdx + 1, radioGroupMembers);
      const key = [
        hint.name,
        hint.type,
        hint.expectedInput.kind,
        JSON.stringify(hint.expectedInput.example ?? null),
        hint.expectedInput.format ?? '',
        hint.expectedInput.canonicalFormat ?? '',
        hint.expectedInput.contentKind ?? '',
        hint.expectedInput.rule ?? '',
        (hint.expectedInput.variableNames ?? []).join('\u0000'),
        (hint.expectedInput.allowedValues ?? []).join('\u0000'),
        hint.expectedInput.groupName ?? '',
        (hint.expectedInput.groupMemberNames ?? []).join('\u0000'),
        String(hint.expectedInput.columnCount ?? ''),
        (hint.expectedInput.columnHeaders ?? []).join('\u0000'),
        hint.expectedInput.acceptsJsonString === true ? '1' : '0',
      ].join('\u0001');
      const existing = hintMap.get(key);

      if (existing) {
        existing.pages = [...new Set([...existing.pages, pageIdx + 1])].sort((a, b) => a - b);
        existing.required = existing.required || hint.required;
        continue;
      }

      hintMap.set(key, hint);
    }
  }

  return [...hintMap.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type),
  );
}

export function validateInputContracts(
  template: Record<string, unknown>,
  inputs: Record<string, unknown>[],
): void {
  const issues = getInputContractIssues(template, inputs);
  if (issues.length > 0) {
    fail(issues[0], { code: 'EVALIDATE', exitCode: 1 });
  }
}

export function getInputContractIssues(
  template: Record<string, unknown>,
  inputs: Record<string, unknown>[],
): string[] {
  const hints = collectInputHints(template);
  const issues: string[] = [];

  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
    const input = inputs[inputIndex] ?? {};

    for (const hint of hints) {
      const issue = getInputContractIssue(hint, input, inputIndex);
      if (issue) {
        issues.push(issue);
      }
    }

    issues.push(...getRadioGroupSelectionIssues(hints, input, inputIndex));
  }

  return issues;
}

export async function loadValidationSource(
  file: string | undefined,
  options: { noInputMessage: string },
): Promise<ValidationSource> {
  const data = await loadValidationInput(file, options.noInputMessage);
  const record = assertRecordObject(data.json, 'Validation input');
  const hasTemplate = 'template' in record;
  const hasInputs = 'inputs' in record;

  if (hasTemplate || hasInputs) {
    if (!hasTemplate || !hasInputs) {
      fail('Unified job validation requires both "template" and "inputs" keys.', {
        code: 'EARG',
        exitCode: 1,
      });
    }

    return {
      mode: 'job',
      template: assertRecordObject(record.template, 'Unified job template'),
      inputs: record.inputs as Record<string, unknown>[],
      options: record.options,
      templateDir: data.templateDir,
      jobWarnings: Object.keys(record)
        .filter((key) => !KNOWN_JOB_KEYS.has(key))
        .sort()
        .map((key) => `Unknown unified job field: ${key}`),
    };
  }

  return {
    mode: 'template',
    template: assertRecordObject(record, 'Template'),
    templateDir: data.templateDir,
    jobWarnings: [],
  };
}

async function loadValidationInput(
  file: string | undefined,
  noInputMessage: string,
): Promise<{ json: unknown; templateDir?: string }> {
  if (!file || file === '-') {
    if (file === '-' || !process.stdin.isTTY) {
      return { json: await readJsonFromStdin() };
    }

    fail(noInputMessage, {
      code: 'EARG',
      exitCode: 1,
    });
  }

  const resolvedFile = resolve(file);
  return {
    json: readJsonFile(resolvedFile),
    templateDir: dirname(resolvedFile),
  };
}

function assertRecordObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${label} must be a JSON object.`, { code: 'EARG', exitCode: 1 });
  }

  return value as Record<string, unknown>;
}

export function normalizeSchemaPages(rawSchemas: unknown): Array<Array<Record<string, unknown>>> {
  if (!Array.isArray(rawSchemas)) {
    return [];
  }

  return rawSchemas.map((page) => {
    if (Array.isArray(page)) {
      return page.filter(
        (schema): schema is Record<string, unknown> =>
          typeof schema === 'object' && schema !== null,
      );
    }

    if (typeof page === 'object' && page !== null) {
      return Object.values(page).filter(
        (schema): schema is Record<string, unknown> =>
          typeof schema === 'object' && schema !== null,
      );
    }

    return [];
  });
}

function buildFieldInputHint(
  schema: Record<string, unknown>,
  page: number,
  radioGroupMembers: Map<string, string[]>,
): FieldInputHint {
  const type = schema.type as string;

  if (type === 'multiVariableText') {
    const variableNames = getUniqueStringValues(
      Array.isArray(schema.variables) ? schema.variables : [],
    );

    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'jsonStringObject',
        variableNames,
        example: buildMultiVariableTextExample(variableNames),
      },
    };
  }

  if (type === 'checkbox' || type === 'circleMark') {
    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'enumString',
        allowedValues: ['false', 'true'],
        example: 'true',
      },
    };
  }

  if (type === 'radioGroup') {
    const groupName = typeof schema.group === 'string' ? schema.group : '';
    const groupMemberNames = groupName ? (radioGroupMembers.get(groupName) ?? []) : [];

    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'enumString',
        allowedValues: ['false', 'true'],
        example: 'true',
        ...(groupName ? { groupName } : {}),
        ...(groupMemberNames.length > 0 ? { groupMemberNames } : {}),
      },
    };
  }

  if (type === 'select') {
    const allowedValues = getUniqueOrderedStringValues(
      Array.isArray(schema.options) ? schema.options : [],
    );

    if (allowedValues.length > 0) {
      return {
        name: schema.name as string,
        type,
        pages: [page],
        required: schema.required === true,
        expectedInput: {
          kind: 'enumString',
          allowedValues,
          example: allowedValues[0],
        },
      };
    }
  }

  const barcodeRule = getBarcodeRule(type);
  if (barcodeRule) {
    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'string',
        contentKind: 'barcodeText',
        rule: barcodeRule,
      },
    };
  }

  const assetContentKind = getAssetContentKind(type);
  if (assetContentKind) {
    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'string',
        contentKind: assetContentKind,
      },
    };
  }

  if (type === 'table') {
    const columnHeaders = getOrderedStringValues(Array.isArray(schema.head) ? schema.head : []);
    const columnCount = getTableColumnCount(schema, columnHeaders);

    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'stringMatrix',
        ...(columnCount > 0 ? { columnCount } : {}),
        ...(columnHeaders.length > 0 ? { columnHeaders } : {}),
        example: buildTableInputExample(columnHeaders, columnCount),
        acceptsJsonString: true,
      },
    };
  }

  if (type === 'list') {
    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'stringArray',
        example: ['First item', 'Second item'],
        acceptsJsonString: true,
      },
    };
  }

  if (type === 'date' || type === 'time' || type === 'dateTime') {
    const canonicalFormat = getCanonicalDateStoredFormat(type);

    return {
      name: schema.name as string,
      type,
      pages: [page],
      required: schema.required === true,
      expectedInput: {
        kind: 'string',
        format: getDateHintFormat(schema, canonicalFormat),
        canonicalFormat,
        example: getDateInputExample(type),
      },
    };
  }

  return {
    name: schema.name as string,
    type,
    pages: [page],
    required: schema.required === true,
    expectedInput: {
      kind: 'string',
    },
  };
}

function buildMultiVariableTextExample(variableNames: string[]): string {
  return JSON.stringify(
    Object.fromEntries(
      variableNames.map((variableName) => [variableName, variableName.toUpperCase()]),
    ),
  );
}

function buildTableInputExample(columnHeaders: string[], columnCount: number): string[][] {
  if (columnCount <= 0) {
    return [];
  }

  return [
    Array.from({ length: columnCount }, (_, index) => {
      const header = columnHeaders[index];
      return header ? `${header} value` : `cell-${index + 1}`;
    }),
  ];
}

function getTableColumnCount(schema: Record<string, unknown>, columnHeaders: string[]): number {
  if (columnHeaders.length > 0) {
    return columnHeaders.length;
  }

  if (Array.isArray(schema.headWidthPercentages) && schema.headWidthPercentages.length > 0) {
    return schema.headWidthPercentages.length;
  }

  const parsedContent = parseTableStringMatrix(schema.content);
  return parsedContent?.[0]?.length ?? 0;
}

function getAssetContentKind(type: string): string | null {
  switch (type) {
    case 'image':
      return 'imageDataUrl';
    case 'signature':
      return 'signatureImageDataUrl';
    case 'svg':
      return 'svgMarkup';
    default:
      return null;
  }
}

function getBarcodeRule(type: string): string | null {
  switch (type) {
    case 'qrcode':
      return 'Any non-empty string up to 499 characters.';
    case 'japanpost':
      return 'Start with 7 digits, then continue with digits, A-Z, or hyphen (-).';
    case 'ean13':
      return '12 or 13 digits; if 13 digits are provided, the final check digit must be valid.';
    case 'ean8':
      return '7 or 8 digits; if 8 digits are provided, the final check digit must be valid.';
    case 'code39':
      return 'Use uppercase A-Z, digits, spaces, and symbols - . $ / + %.';
    case 'code128':
      return 'Text must not contain Kanji, Hiragana, Katakana, or full-width ASCII characters.';
    case 'nw7':
      return 'Start and end with A-D; inner characters may be digits or - . $ : / +.';
    case 'itf14':
      return '13 or 14 digits; if 14 digits are provided, the final check digit must be valid.';
    case 'upca':
      return '11 or 12 digits; if 12 digits are provided, the final check digit must be valid.';
    case 'upce':
      return 'Must start with 0 and be 7 or 8 digits total; if 8 digits are provided, the final check digit must be valid.';
    case 'gs1datamatrix':
      return 'Include (01) followed by a GTIN of 8, 12, 13, or 14 digits with a valid check digit; total length must be 52 characters or fewer.';
    case 'pdf417':
      return 'Any non-empty string up to 1000 characters.';
    default:
      return null;
  }
}

function getCanonicalDateStoredFormat(type: 'date' | 'time' | 'dateTime'): string {
  switch (type) {
    case 'date':
      return 'yyyy/MM/dd';
    case 'time':
      return 'HH:mm';
    case 'dateTime':
      return 'yyyy/MM/dd HH:mm';
  }
}

function getDateHintFormat(schema: Record<string, unknown>, canonicalFormat: string): string {
  const formatValue = typeof schema.format === 'string' ? schema.format.trim() : '';
  if (!formatValue || formatValue === 'undefined') {
    return canonicalFormat;
  }

  return formatValue;
}

function getDateInputExample(type: 'date' | 'time' | 'dateTime'): string {
  switch (type) {
    case 'date':
      return '2026/03/28';
    case 'time':
      return '14:30';
    case 'dateTime':
      return '2026/03/28 14:30';
  }
}

function getInputContractIssue(
  hint: FieldInputHint,
  input: Record<string, unknown>,
  inputIndex: number,
): string | null {
  if (hint.expectedInput.kind === 'jsonStringObject') {
    return getMultiVariableTextInputIssue(hint, input, inputIndex);
  }

  if (hint.expectedInput.kind === 'enumString') {
    return getEnumStringInputIssue(hint, input, inputIndex);
  }

  if (hint.expectedInput.kind === 'stringMatrix') {
    return getStringMatrixInputIssue(hint, input, inputIndex);
  }

  if (hint.expectedInput.kind === 'stringArray') {
    return getStringArrayInputIssue(hint, input, inputIndex);
  }

  if (isCanonicalDateHint(hint)) {
    return getCanonicalDateInputIssue(hint, input, inputIndex);
  }

  return null;
}

function getMultiVariableTextInputIssue(
  hint: FieldInputHint,
  input: Record<string, unknown>,
  inputIndex: number,
): string | null {
  const rawValue = input[hint.name];
  const variableNames = hint.expectedInput.variableNames ?? [];
  const example = hint.expectedInput.example ?? '{}';

  if (rawValue === undefined || rawValue === '') {
    if (!hint.required || variableNames.length === 0) {
      return null;
    }

    return buildMultiVariableTextErrorMessage({
      hint,
      inputIndex,
      extra: `Missing variables: ${variableNames.join(', ')}.`,
      example,
    });
  }

  if (typeof rawValue !== 'string') {
    return buildMultiVariableTextErrorMessage({
      hint,
      inputIndex,
      extra: `Received ${describeValue(rawValue)}.`,
      example,
    });
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    return buildMultiVariableTextErrorMessage({
      hint,
      inputIndex,
      extra: `Received ${describeValue(rawValue)}.`,
      example,
    });
  }

  if (typeof parsedValue !== 'object' || parsedValue === null || Array.isArray(parsedValue)) {
    return buildMultiVariableTextErrorMessage({
      hint,
      inputIndex,
      extra: `Received ${describeValue(parsedValue)}.`,
      example,
    });
  }

  if (!hint.required || variableNames.length === 0) {
    return null;
  }

  const values = parsedValue as Record<string, unknown>;
  const missingVariables = variableNames.filter((variableName) => !values[variableName]);
  if (missingVariables.length > 0) {
    return buildMultiVariableTextErrorMessage({
      hint,
      inputIndex,
      extra: `Missing variables: ${missingVariables.join(', ')}.`,
      example,
    });
  }

  return null;
}

function getRadioGroupSelectionIssues(
  hints: FieldInputHint[],
  input: Record<string, unknown>,
  inputIndex: number,
): string[] {
  const groups = new Map<string, FieldInputHint[]>();

  for (const hint of hints) {
    if (
      hint.type !== 'radioGroup' ||
      !hint.expectedInput.groupName ||
      (hint.expectedInput.groupMemberNames?.length ?? 0) <= 1
    ) {
      continue;
    }

    const groupName = hint.expectedInput.groupName;
    const existing = groups.get(groupName);
    if (existing) {
      existing.push(hint);
    } else {
      groups.set(groupName, [hint]);
    }
  }

  const issues: string[] = [];

  for (const [groupName, groupHints] of groups) {
    const selectedNames = groupHints
      .filter((hint) => input[hint.name] === 'true')
      .map((hint) => hint.name);

    if (selectedNames.length <= 1) {
      continue;
    }

    issues.push(
      buildRadioGroupSelectionErrorMessage({
        groupName,
        inputIndex,
        groupMemberNames:
          groupHints[0]?.expectedInput.groupMemberNames ?? groupHints.map((hint) => hint.name),
        selectedNames,
      }),
    );
  }

  return issues;
}

function getEnumStringInputIssue(
  hint: FieldInputHint,
  input: Record<string, unknown>,
  inputIndex: number,
): string | null {
  const rawValue = input[hint.name];
  const allowedValues = hint.expectedInput.allowedValues ?? [];
  const example = hint.expectedInput.example;

  if (rawValue === undefined || rawValue === '') {
    return null;
  }

  if (typeof rawValue !== 'string') {
    return buildEnumStringErrorMessage({
      hint,
      inputIndex,
      extra: `Received ${describeValue(rawValue)}.`,
      example,
    });
  }

  if (allowedValues.length === 0 || allowedValues.includes(rawValue)) {
    return null;
  }

  return buildEnumStringErrorMessage({
    hint,
    inputIndex,
    extra: `Received ${describeValue(rawValue)}.`,
    example,
  });
}

function getStringMatrixInputIssue(
  hint: FieldInputHint,
  input: Record<string, unknown>,
  inputIndex: number,
): string | null {
  const rawValue = input[hint.name];
  const example = hint.expectedInput.example;

  if (rawValue === undefined || rawValue === '') {
    return null;
  }

  const parsedValue =
    typeof rawValue === 'string' && hint.expectedInput.acceptsJsonString === true
      ? (parseTableStringMatrix(rawValue) ?? rawValue)
      : rawValue;

  const issue = getStringMatrixShapeIssue(parsedValue, hint.expectedInput.columnCount);
  if (!issue) {
    return null;
  }

  return buildStringMatrixErrorMessage({
    hint,
    inputIndex,
    extra: issue,
    example,
  });
}

function getStringArrayInputIssue(
  hint: FieldInputHint,
  input: Record<string, unknown>,
  inputIndex: number,
): string | null {
  const rawValue = input[hint.name];
  const example = hint.expectedInput.example;

  if (rawValue === undefined || rawValue === '') {
    return null;
  }

  const parsedValue =
    typeof rawValue === 'string' && hint.expectedInput.acceptsJsonString === true
      ? (parseListJsonInput(rawValue) ?? rawValue)
      : rawValue;

  const issue = getStringArrayShapeIssue(parsedValue);
  if (!issue) {
    return null;
  }

  return buildStringArrayErrorMessage({
    hint,
    inputIndex,
    extra: issue,
    example,
  });
}

function isCanonicalDateHint(hint: FieldInputHint): hint is FieldInputHint & {
  type: 'date' | 'time' | 'dateTime';
  expectedInput: FieldInputHint['expectedInput'] & { canonicalFormat: string };
} {
  return (
    (hint.type === 'date' || hint.type === 'time' || hint.type === 'dateTime') &&
    typeof hint.expectedInput.canonicalFormat === 'string' &&
    hint.expectedInput.canonicalFormat.length > 0
  );
}

function getCanonicalDateInputIssue(
  hint: FieldInputHint & {
    type: 'date' | 'time' | 'dateTime';
    expectedInput: FieldInputHint['expectedInput'] & { canonicalFormat: string };
  },
  input: Record<string, unknown>,
  inputIndex: number,
): string | null {
  const rawValue = input[hint.name];
  const example = hint.expectedInput.example;

  if (rawValue === undefined || rawValue === '') {
    return null;
  }

  if (typeof rawValue !== 'string') {
    return buildCanonicalDateErrorMessage({
      hint,
      inputIndex,
      extra: `Received ${describeValue(rawValue)}.`,
      example,
    });
  }

  if (isValidCanonicalDateValue(rawValue, hint.type)) {
    return null;
  }

  return buildCanonicalDateErrorMessage({
    hint,
    inputIndex,
    extra: `Received ${describeValue(rawValue)}.`,
    example,
  });
}

function getStringMatrixShapeIssue(value: unknown, expectedColumnCount?: number): string | null {
  if (!Array.isArray(value)) {
    return `Received ${describeValue(value)}.`;
  }

  const columnCount = expectedColumnCount ?? getFirstArrayLength(value);

  for (let rowIndex = 0; rowIndex < value.length; rowIndex++) {
    const row = value[rowIndex];
    if (!Array.isArray(row)) {
      return `Row ${rowIndex + 1} must be an array of strings. Received ${describeValue(row)}.`;
    }

    if (columnCount > 0 && row.length !== columnCount) {
      return `Row ${rowIndex + 1} must contain ${columnCount} cells. Received ${row.length}.`;
    }

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex];
      if (typeof cell !== 'string') {
        return `Cell [${rowIndex + 1}, ${colIndex + 1}] must be a string. Received ${describeValue(cell)}.`;
      }
    }
  }

  return null;
}

function getStringArrayShapeIssue(value: unknown): string | null {
  if (typeof value === 'string') {
    return null;
  }

  if (!Array.isArray(value)) {
    return `Received ${describeValue(value)}.`;
  }

  for (let index = 0; index < value.length; index++) {
    if (typeof value[index] !== 'string') {
      return `Item ${index + 1} must be a string. Received ${describeValue(value[index])}.`;
    }
  }

  return null;
}

function getFirstArrayLength(rows: unknown[]): number {
  for (const row of rows) {
    if (Array.isArray(row)) {
      return row.length;
    }
  }

  return 0;
}

function parseTableStringMatrix(rawValue: unknown): string[][] | null {
  if (typeof rawValue !== 'string') {
    return null;
  }

  try {
    return JSON.parse(rawValue) as string[][];
  } catch {
    return null;
  }
}

function parseListJsonInput(rawValue: unknown): unknown | null {
  if (typeof rawValue !== 'string') {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function isValidCanonicalDateValue(value: string, type: 'date' | 'time' | 'dateTime'): boolean {
  switch (type) {
    case 'date':
      return isValidCanonicalDate(value);
    case 'time':
      return isValidCanonicalTime(value);
    case 'dateTime':
      return isValidCanonicalDateTime(value);
  }
}

function isValidCanonicalDate(value: string): boolean {
  const match = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  if (!isValidCalendarDate(Number(year), Number(month), Number(day))) {
    return false;
  }

  const parsed = parseRendererDateValue(value, 'date');
  return parsed !== null && formatCanonicalDateValue(parsed, 'date') === value;
}

function isValidCanonicalTime(value: string): boolean {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, hours, minutes] = match;
  return isValidClockTime(Number(hours), Number(minutes));
}

function isValidCanonicalDateTime(value: string): boolean {
  const match = value.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, year, month, day, hours, minutes] = match;
  if (
    !isValidCalendarDate(Number(year), Number(month), Number(day)) ||
    !isValidClockTime(Number(hours), Number(minutes))
  ) {
    return false;
  }

  const parsed = parseRendererDateValue(value, 'dateTime');
  return parsed !== null && formatCanonicalDateValue(parsed, 'dateTime') === value;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function isValidClockTime(hours: number, minutes: number): boolean {
  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

function parseRendererDateValue(value: string, type: 'date' | 'time' | 'dateTime'): Date | null {
  const parsed = type === 'time' ? new Date(`2021-01-01T${value}`) : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCanonicalDateValue(date: Date, type: 'date' | 'time' | 'dateTime'): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  switch (type) {
    case 'date':
      return `${year}/${month}/${day}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'dateTime':
      return `${year}/${month}/${day} ${hours}:${minutes}`;
  }
}

function buildMultiVariableTextErrorMessage(args: {
  hint: FieldInputHint;
  inputIndex: number;
  extra: string;
  example: string | string[] | string[][];
}): string {
  const variableLabel =
    args.hint.expectedInput.variableNames && args.hint.expectedInput.variableNames.length > 0
      ? ` with variables: ${args.hint.expectedInput.variableNames.join(', ')}`
      : '';

  return `Field "${args.hint.name}" (multiVariableText) in input ${args.inputIndex + 1} expects a JSON string object${variableLabel}. Example: ${args.example}. ${args.extra}`;
}

function buildEnumStringErrorMessage(args: {
  hint: FieldInputHint;
  inputIndex: number;
  extra: string;
  example?: string | string[] | string[][];
}): string {
  const allowedValues = (args.hint.expectedInput.allowedValues ?? []).map((value) =>
    JSON.stringify(value),
  );
  const allowedLabel =
    allowedValues.length > 0 ? ` one of: ${allowedValues.join(', ')}` : ' a supported string value';
  const exampleLabel =
    args.example !== undefined ? ` Example: ${JSON.stringify(args.example)}.` : '';

  return `Field "${args.hint.name}" (${args.hint.type}) in input ${args.inputIndex + 1} expects${allowedLabel}.${exampleLabel} ${args.extra}`.trim();
}

function buildStringMatrixErrorMessage(args: {
  hint: FieldInputHint;
  inputIndex: number;
  extra: string;
  example?: string | string[] | string[][];
}): string {
  const columnCount = args.hint.expectedInput.columnCount;
  const columnHeaders = args.hint.expectedInput.columnHeaders ?? [];
  const columnLabel =
    typeof columnCount === 'number' && columnCount > 0 ? ` with ${columnCount} cells per row` : '';
  const headerLabel =
    columnHeaders.length > 0 ? ` Column headers: ${columnHeaders.join(', ')}.` : '';
  const exampleLabel =
    args.example !== undefined ? ` Example: ${JSON.stringify(args.example)}.` : '';
  const compatibilityLabel =
    args.hint.expectedInput.acceptsJsonString === true
      ? ' JSON string input is also accepted for compatibility.'
      : '';

  return `Field "${args.hint.name}" (${args.hint.type}) in input ${args.inputIndex + 1} expects a JSON array of string arrays${columnLabel}.${headerLabel}${exampleLabel}${compatibilityLabel} ${args.extra}`.trim();
}

function buildStringArrayErrorMessage(args: {
  hint: FieldInputHint;
  inputIndex: number;
  extra: string;
  example?: string | string[] | string[][];
}): string {
  const exampleLabel =
    args.example !== undefined ? ` Example: ${JSON.stringify(args.example)}.` : '';
  const compatibilityLabel =
    args.hint.expectedInput.acceptsJsonString === true
      ? ' A newline string or JSON string array is also accepted.'
      : '';

  return `Field "${args.hint.name}" (${args.hint.type}) in input ${args.inputIndex + 1} expects an array of strings.${exampleLabel}${compatibilityLabel} ${args.extra}`.trim();
}

function buildCanonicalDateErrorMessage(args: {
  hint: FieldInputHint & {
    type: 'date' | 'time' | 'dateTime';
    expectedInput: FieldInputHint['expectedInput'] & { canonicalFormat: string };
  };
  inputIndex: number;
  extra: string;
  example?: string | string[] | string[][];
}): string {
  const displayFormat = args.hint.expectedInput.format;
  const displayLabel =
    typeof displayFormat === 'string' &&
    displayFormat.length > 0 &&
    displayFormat !== args.hint.expectedInput.canonicalFormat
      ? ` Display format hint: ${displayFormat}.`
      : '';
  const exampleLabel =
    args.example !== undefined ? ` Example: ${JSON.stringify(args.example)}.` : '';

  return `Field "${args.hint.name}" (${args.hint.type}) in input ${args.inputIndex + 1} expects canonical stored content in format ${args.hint.expectedInput.canonicalFormat}.${displayLabel}${exampleLabel} ${args.extra}`.trim();
}

function buildRadioGroupSelectionErrorMessage(args: {
  groupName: string;
  inputIndex: number;
  groupMemberNames: string[];
  selectedNames: string[];
}): string {
  return `Radio group "${args.groupName}" in input ${args.inputIndex + 1} allows at most one "true" value across fields: ${args.groupMemberNames.join(', ')}. Received "true" for: ${args.selectedNames.join(', ')}. Set one field to "true" and the others to "false".`;
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const kind = trimmed.startsWith('{') || trimmed.startsWith('[') ? 'string' : 'plain string';
    return `${kind} ${JSON.stringify(value)}`;
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${typeof value} ${JSON.stringify(value)}`;
  }

  return typeof value;
}

export function getUniqueStringValues(values: unknown[]): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ].sort();
}

function getUniqueOrderedStringValues(values: unknown[]): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ];
}

function getOrderedStringValues(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function collectRadioGroupMembers(
  schemaPages: Array<Array<Record<string, unknown>>>,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const page of schemaPages) {
    for (const schema of page) {
      if (schema.readOnly === true || schema.type !== 'radioGroup') {
        continue;
      }

      const name = typeof schema.name === 'string' ? schema.name : '';
      const groupName = typeof schema.group === 'string' ? schema.group : '';
      if (!name || !groupName) {
        continue;
      }

      const existing = groups.get(groupName);
      if (existing) {
        if (!existing.includes(name)) {
          existing.push(name);
        }
      } else {
        groups.set(groupName, [name]);
      }
    }
  }

  return groups;
}

export function summarizeBasePdf(
  basePdf: unknown,
  templateDir: string | undefined,
): ValidationInspection['basePdf'] {
  if (typeof basePdf === 'string') {
    if (basePdf.startsWith('data:')) {
      return { kind: 'dataUri' };
    }

    if (basePdf.endsWith('.pdf')) {
      return {
        kind: 'pdfPath',
        path: basePdf,
        resolvedPath: templateDir ? resolve(templateDir, basePdf) : resolve(basePdf),
      };
    }

    return { kind: 'string' };
  }

  if (basePdf && typeof basePdf === 'object') {
    if ('width' in basePdf && 'height' in basePdf) {
      const width =
        typeof (basePdf as { width?: unknown }).width === 'number'
          ? (basePdf as { width: number }).width
          : undefined;
      const height =
        typeof (basePdf as { height?: unknown }).height === 'number'
          ? (basePdf as { height: number }).height
          : undefined;

      return {
        kind: 'blank',
        width,
        height,
        paperSize:
          width !== undefined && height !== undefined ? detectPaperSize(width, height) : null,
      };
    }

    return { kind: 'object' };
  }
  return { kind: 'missing' };
}
