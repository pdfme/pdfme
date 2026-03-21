#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const forwardArgs = process.argv.slice(2);

const rootPackageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const workspaces = rootPackageJson.workspaces.filter((workspace) =>
  readWorkspacePackageJson(workspace).scripts?.test,
);

const defaultConcurrency = Math.min(
  workspaces.length,
  Math.max(2, Math.min(4, os.availableParallelism?.() ?? os.cpus().length)),
);
const concurrency = parseConcurrency(process.env.PDFME_TEST_CONCURRENCY, defaultConcurrency);

const failures = [];
const durations = new Map();
let queueIndex = 0;

console.log(`[root:test] Running ${workspaces.length} workspace test suites with concurrency ${concurrency}.`);

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (queueIndex < workspaces.length) {
      const workspace = workspaces[queueIndex];
      queueIndex += 1;
      const result = await runWorkspaceTest(workspace);
      durations.set(workspace, result.durationMs);
      if (result.code !== 0) {
        failures.push(workspace);
      }
    }
  }),
);

for (const workspace of workspaces) {
  const durationMs = durations.get(workspace) ?? 0;
  const status = failures.includes(workspace) ? 'failed' : 'passed';
  console.log(`[root:test] ${workspace} ${status} in ${formatDuration(durationMs)}`);
}

if (failures.length > 0) {
  console.error(`[root:test] ${failures.length} workspace test run(s) failed.`);
  process.exit(1);
}

function readWorkspacePackageJson(workspace) {
  return JSON.parse(readFileSync(path.join(repoRoot, workspace, 'package.json'), 'utf8'));
}

function parseConcurrency(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, workspaces.length);
}

function runWorkspaceTest(workspace) {
  const label = path.basename(workspace);
  const args = ['run', 'test', '-w', workspace];
  if (forwardArgs.length > 0) {
    args.push('--', ...forwardArgs);
  }

  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn('npm', args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    pipeOutput(child.stdout, label, false);
    pipeOutput(child.stderr, label, true);

    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        durationMs: Date.now() - start,
      });
    });
  });
}

function pipeOutput(stream, label, useErrorStream) {
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    buffer = flushCompleteLines(buffer, label, useErrorStream);
  });

  stream.on('end', () => {
    if (buffer.length > 0) {
      writeLine(label, buffer, useErrorStream);
    }
  });
}

function flushCompleteLines(buffer, label, useErrorStream) {
  const lines = buffer.split(/\r?\n/);
  const remainder = lines.pop() ?? '';

  for (const line of lines) {
    writeLine(label, line, useErrorStream);
  }

  return remainder;
}

function writeLine(label, line, useErrorStream) {
  if (line.length === 0) {
    return;
  }

  const writer = useErrorStream ? console.error : console.log;
  writer(`[${label}] ${line}`);
}

function formatDuration(durationMs) {
  return `${(durationMs / 1000).toFixed(2)}s`;
}
