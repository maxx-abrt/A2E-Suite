import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import extractTasksFromDocumentTool from '../extract-tasks-from-document.logic-function.ts';
import standupDigestTool from '../standup-digest.logic-function.ts';
import taskBreakdownContextTool from '../task-breakdown-context.logic-function.ts';

// The two P9.2 Projects tools register on the native tool registry the only
// supported way — a logic function carrying `toolTriggerSettings` (P1.5 /
// P9.1 rule). No `registerAiTools`, no bespoke table, no manual hook. The read
// behaviour itself is pinned in the handler specs.

const LOGIC_FUNCTION_REGISTRY = Object.values(LOGIC_FUNCTION_IDS) as string[];

test('standup-digest is declared as a native AI tool', () => {
  assert.equal(
    standupDigestTool.success,
    true,
    standupDigestTool.errors.join(', '),
  );

  const config = standupDigestTool.config;

  assert.equal(config.name, 'standup-digest');
  assert.equal(config.universalIdentifier, LOGIC_FUNCTION_IDS.standupDigest);
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('standup-digest takes an optional window and an optional project', () => {
  const inputSchema = standupDigestTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.equal(inputSchema?.required, undefined);
  assert.equal(inputSchema?.properties?.sinceIso?.type, 'string');
  assert.equal(inputSchema?.properties?.projectId?.type, 'string');
});

test('task-breakdown-context is declared as a native AI tool', () => {
  assert.equal(
    taskBreakdownContextTool.success,
    true,
    taskBreakdownContextTool.errors.join(', '),
  );

  const config = taskBreakdownContextTool.config;

  assert.equal(config.name, 'task-breakdown-context');
  assert.equal(
    config.universalIdentifier,
    LOGIC_FUNCTION_IDS.taskBreakdownContext,
  );
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('task-breakdown-context requires a project id', () => {
  const inputSchema =
    taskBreakdownContextTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['projectId']);
  assert.equal(inputSchema?.properties?.projectId?.type, 'string');
});

test('extract-tasks-from-document is declared as a native AI tool', () => {
  assert.equal(
    extractTasksFromDocumentTool.success,
    true,
    extractTasksFromDocumentTool.errors.join(', '),
  );

  const config = extractTasksFromDocumentTool.config;

  assert.equal(config.name, 'extract-tasks-from-document');
  assert.equal(
    config.universalIdentifier,
    LOGIC_FUNCTION_IDS.extractTasksFromDocument,
  );
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(config.toolTriggerSettings);
});

test('extract-tasks-from-document addresses both the document and project contexts', () => {
  // Cross-app mapping: the tool belongs to Projects but must surface on the
  // Documents page it reads from, so its input schema references the document.
  const inputSchema =
    extractTasksFromDocumentTool.config.toolTriggerSettings?.inputSchema;

  assert.deepEqual(inputSchema?.required, ['documentId']);
  assert.equal(inputSchema?.properties?.documentId?.type, 'string');
  assert.equal(inputSchema?.properties?.projectId?.type, 'string');
});

test('every projects tool references the project object so it surfaces on a project record', () => {
  const tools = [
    standupDigestTool,
    taskBreakdownContextTool,
    extractTasksFromDocumentTool,
  ];

  for (const tool of tools) {
    const properties =
      tool.config.toolTriggerSettings?.inputSchema?.properties ?? {};

    assert.ok(
      properties.projectId,
      `${tool.config.name} must take a projectId to map to the project context`,
    );
  }
});
