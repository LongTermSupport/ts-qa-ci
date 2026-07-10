import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs } from './ts-qa.js';

/**
 * Unit tests for the CLI arg parser (GitHub issue #6, BUG C/D). Run with
 * `node --test bin/ts-qa.test.js` — bin/ is plain JS and lives outside the
 * vitest `src/**` include glob, so it uses the built-in node test runner.
 */

// BUG C: -t / -p with a missing operand must fail loudly, not silently set undefined.
test('-t with no operand throws', () => {
  assert.throws(() => parseArgs(['-t']), /-t requires a value/);
});

test('-t followed by another flag throws (does not swallow the flag)', () => {
  assert.throws(() => parseArgs(['-t', '--json']), /-t requires a value/);
});

test('-t with a real operand sets options.tool', () => {
  const { options } = parseArgs(['-t', 'tsc']);
  assert.equal(options.tool, 'tsc');
});

test('-p with no operand throws', () => {
  assert.throws(() => parseArgs(['-p']), /-p requires a value/);
});

test('-p followed by another flag throws', () => {
  assert.throws(() => parseArgs(['-p', '--aggregate']), /-p requires a value/);
});

test('-p with a real operand sets options.path', () => {
  const { options } = parseArgs(['-p', 'src/foo.ts']);
  assert.equal(options.path, 'src/foo.ts');
});

// BUG D: plain --aggregate must be forced read-only.
test('--aggregate forces read-only', () => {
  const { options } = parseArgs(['--aggregate']);
  assert.equal(options.forceReadOnly, true);
  assert.equal(options.aggregate, true);
});

test('--aggregate --read-only stays read-only', () => {
  const { options } = parseArgs(['--aggregate', '--read-only']);
  assert.equal(options.forceReadOnly, true);
});

test('--aggregate --write is still rejected', () => {
  assert.throws(() => parseArgs(['--aggregate', '--write']), /--aggregate is only valid for read-only/);
});

test('a plain run is NOT forced read-only', () => {
  const { options } = parseArgs([]);
  assert.equal(options.forceReadOnly, undefined);
});
