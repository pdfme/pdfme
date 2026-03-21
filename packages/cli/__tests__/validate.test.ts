import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', 'dist', 'index.js');
const TMP = join(__dirname, '..', '.test-tmp');

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf8',
      timeout: 30000,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      exitCode: error.status ?? 1,
    };
  }
}

describe('validate command', () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('validates a valid template', () => {
    const template = {
      basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
      schemas: [[
        { name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 170, height: 15 },
      ]],
    };
    const file = join(TMP, 'valid.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Template is valid');
    expect(result.stdout).toContain('1 page');
    expect(result.stdout).toContain('1 field');
  });

  it('reports unknown type with suggestion', () => {
    const template = {
      basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
      schemas: [[
        { name: 'title', type: 'textbox', position: { x: 20, y: 20 }, width: 170, height: 15 },
      ]],
    };
    const file = join(TMP, 'bad-type.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('unknown type "textbox"');
    expect(result.stdout).toContain('Did you mean: text');
  });

  it('warns about out-of-bounds field', () => {
    const template = {
      basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
      schemas: [[
        { name: 'wide', type: 'text', position: { x: 200, y: 20 }, width: 50, height: 15 },
      ]],
    };
    const file = join(TMP, 'oob.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file]);
    // Should pass (warnings don't cause exit 1 by default)
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('extends beyond page width');
  });

  it('--strict fails on warnings', () => {
    const template = {
      basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
      schemas: [[
        { name: 'wide', type: 'text', position: { x: 200, y: 20 }, width: 50, height: 15 },
      ]],
    };
    const file = join(TMP, 'oob-strict.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file, '--strict']);
    expect(result.exitCode).toBe(1);
  });

  it('--json outputs structured result', () => {
    const template = {
      basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
      schemas: [[
        { name: 'title', type: 'text', position: { x: 20, y: 20 }, width: 170, height: 15 },
      ]],
    };
    const file = join(TMP, 'json-out.json');
    writeFileSync(file, JSON.stringify(template));

    const result = runCli(['validate', file, '--json']);
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.valid).toBe(true);
    expect(parsed.pages).toBe(1);
    expect(parsed.fields).toBe(1);
  });
});
