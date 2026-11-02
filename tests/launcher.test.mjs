import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const file of ['RUN-EXPRESS.cmd', 'DIAGNOSE-WINDOWS.cmd']) {
  test(`${file}: npm version returns control to batch script`, () => {
    const content = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(content, /^call npm\.cmd -v(?:[ \t]+>>[^\r\n]+)?\r?$/im);
    assert.doesNotMatch(content, /^npm\s+(?:-v|--version)$/im);
  });
}

test('RUN-EXPRESS.cmd: installs and starts Vite through call', () => {
  const content = readFileSync(new URL('../RUN-EXPRESS.cmd', import.meta.url), 'utf8');
  assert.match(content, /^\s*call npm install --include=optional --no-audit --no-fund$/im);
  assert.match(content, /^call npm run dev$/im);
});

test('START-WINDOWS.bat keeps an interactive command shell running', () => {
  const content = readFileSync(new URL('../START-WINDOWS.bat', import.meta.url), 'utf8');
  assert.match(content, /\/K\s+RUN-EXPRESS\.cmd/i);
});
