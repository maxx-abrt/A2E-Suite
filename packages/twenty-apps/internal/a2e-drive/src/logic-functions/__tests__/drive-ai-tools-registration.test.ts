import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LOGIC_FUNCTION_IDS,
  OBJECT_IDS,
} from '../../constants/universal-identifiers.ts';
import dedupeHintsTool from '../dedupe-hints.ts';
import findFileTool from '../find-file.ts';

// The two P9.2 Drive tools register on the native tool registry the only
// supported way — a logic function carrying `toolTriggerSettings` (P1.5 /
// P9.1 rule). No `registerAiTools`, no bespoke table, no manual hook. The read
// behaviour itself is pinned in the handler specs.

const LOGIC_FUNCTION_REGISTRY = Object.values(LOGIC_FUNCTION_IDS) as string[];

test('find-file is declared as a native AI tool', () => {
  assert.equal(findFileTool.success, true, findFileTool.errors.join(', '));

  const config = findFileTool.config;

  assert.equal(config.name, 'find-file');
  assert.equal(config.universalIdentifier, LOGIC_FUNCTION_IDS.findFile);
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('find-file requires a query and offers metadata filters', () => {
  const inputSchema = findFileTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['query']);
  assert.equal(inputSchema?.properties?.query?.type, 'string');
  assert.equal(inputSchema?.properties?.sourceApp?.type, 'string');
  assert.equal(inputSchema?.properties?.folderId?.type, 'string');
  assert.equal(inputSchema?.properties?.type?.type, 'string');
});

test('find-file references driveFolder so it surfaces as a context button', () => {
  // The front `getContextToolButtons` mapping resolves a tool to the open
  // record through the declared record reference, so the folder filter carries
  // the app-owned object's universal identifier (P9.1 prompt/action library).
  const inputSchema = findFileTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(
    inputSchema?.properties?.folderId?.objectUniversalIdentifier,
    OBJECT_IDS.driveFolder,
  );
});

test('dedupe-hints is declared as a native AI tool', () => {
  assert.equal(
    dedupeHintsTool.success,
    true,
    dedupeHintsTool.errors.join(', '),
  );

  const config = dedupeHintsTool.config;

  assert.equal(config.name, 'dedupe-hints');
  assert.equal(config.universalIdentifier, LOGIC_FUNCTION_IDS.dedupeHints);
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('dedupe-hints takes only an optional folder scope', () => {
  const inputSchema = dedupeHintsTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, undefined);
  assert.equal(inputSchema?.properties?.folderId?.type, 'string');
});

test('dedupe-hints references driveFolder so it surfaces as a context button', () => {
  const inputSchema = dedupeHintsTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(
    inputSchema?.properties?.folderId?.objectUniversalIdentifier,
    OBJECT_IDS.driveFolder,
  );
});
