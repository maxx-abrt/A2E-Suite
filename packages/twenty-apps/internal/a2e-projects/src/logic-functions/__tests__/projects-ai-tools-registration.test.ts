import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
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
