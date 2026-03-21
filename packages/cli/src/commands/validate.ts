import { defineCommand } from 'citty';
import { checkTemplate } from '@pdfme/common';
import * as schemas from '@pdfme/schemas';
import { readJsonFile } from '../utils.js';

// Filter to only actual schema plugins (objects with pdf/ui/propPanel).
// Excludes utility exports like getDynamicHeightsForTable, builtInPlugins.
const BUILTIN_TYPES = new Set(
  Object.entries(schemas)
    .filter(([, v]) => v && typeof v === 'object' && 'pdf' in v)
    .map(([k]) => k),
);
// barcodes is a collection — expand its individual types
if ('barcodes' in schemas && typeof schemas.barcodes === 'object') {
  BUILTIN_TYPES.delete('barcodes');
  for (const key of Object.keys(schemas.barcodes as Record<string, unknown>)) {
    BUILTIN_TYPES.add(key);
  }
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
  pages: number;
  fields: number;
}

function findClosestType(type: string): string | null {
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  for (const known of BUILTIN_TYPES) {
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

function validateTemplate(template: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalFields = 0;

  // Structural validation via checkTemplate
  try {
    checkTemplate(template);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const schemaPages = template.schemas as Record<string, unknown>[][] | undefined;
  if (!Array.isArray(schemaPages)) {
    return { errors, warnings, pages: 0, fields: 0 };
  }

  // Get page dimensions for bounds checking
  let pageWidth = 210;
  let pageHeight = 297;
  if (template.basePdf && typeof template.basePdf === 'object' && 'width' in (template.basePdf as object)) {
    pageWidth = (template.basePdf as { width: number }).width;
    pageHeight = (template.basePdf as { height: number }).height;
  }

  const allNames = new Map<string, number[]>(); // name → page indices

  for (let pageIdx = 0; pageIdx < schemaPages.length; pageIdx++) {
    const page = schemaPages[pageIdx];
    if (!Array.isArray(page)) continue;

    const pageNames = new Set<string>();

    for (const schema of page) {
      if (typeof schema !== 'object' || schema === null) continue;
      totalFields++;

      const name = schema.name as string;
      const type = schema.type as string;
      const position = schema.position as { x: number; y: number } | undefined;
      const width = schema.width as number | undefined;
      const height = schema.height as number | undefined;

      // Type check
      if (type && !BUILTIN_TYPES.has(type)) {
        const suggestion = findClosestType(type);
        const hint = suggestion ? ` Did you mean: ${suggestion}?` : '';
        errors.push(
          `Field "${name}" has unknown type "${type}".${hint} Available types: ${[...BUILTIN_TYPES].join(', ')}`,
        );
      }

      // Duplicate name on same page
      if (name && pageNames.has(name)) {
        errors.push(`Duplicate field name "${name}" on page ${pageIdx + 1}`);
      }
      if (name) {
        pageNames.add(name);
        if (!allNames.has(name)) allNames.set(name, []);
        allNames.get(name)!.push(pageIdx + 1);
      }

      // Bounds check
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

  // Cross-page duplicate names
  for (const [name, pages] of allNames) {
    if (pages.length > 1) {
      warnings.push(`Field name "${name}" appears on multiple pages: ${pages.join(', ')}`);
    }
  }

  return { errors, warnings, pages: schemaPages.length, fields: totalFields };
}

export default defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate a pdfme template JSON file',
  },
  args: {
    file: { type: 'positional', description: 'Template JSON file', required: true },
    json: { type: 'boolean', description: 'Machine-readable JSON output', default: false },
    strict: { type: 'boolean', description: 'Treat warnings as errors', default: false },
  },
  run({ args }) {
    const template = readJsonFile(args.file) as Record<string, unknown>;
    const result = validateTemplate(template);

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            valid: result.errors.length === 0 && (!args.strict || result.warnings.length === 0),
            pages: result.pages,
            fields: result.fields,
            errors: result.errors,
            warnings: result.warnings,
          },
          null,
          2,
        ),
      );
    } else {
      if (result.errors.length === 0 && result.warnings.length === 0) {
        console.log(
          `\u2713 Template is valid (${result.pages} page(s), ${result.fields} field(s))`,
        );
      }
      for (const err of result.errors) {
        console.log(`\u2717 Error: ${err}`);
      }
      for (const warn of result.warnings) {
        console.log(`\u26a0 Warning: ${warn}`);
      }
    }

    if (result.errors.length > 0) {
      process.exit(1);
    }
    if (args.strict && result.warnings.length > 0) {
      process.exit(1);
    }
  },
});
