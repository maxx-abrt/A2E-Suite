import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import catchMeUpTool from '../catch-me-up.logic-function.ts';
import summarizeChannelTool from '../summarize-channel.logic-function.ts';

// The two P9.2 chat tools register on the native tool registry the only
// supported way — a logic function carrying `toolTriggerSettings` (P1.5 /
// P9.1 rule). No `registerAiTools`, no bespoke table, no manual hook. The
// read behaviour itself is pinned in the handler specs.

const LOGIC_FUNCTION_REGISTRY = Object.values(LOGIC_FUNCTION_IDS) as string[];

test('summarize-channel is declared as a native AI tool', () => {
  assert.equal(
    summarizeChannelTool.success,
    true,
    summarizeChannelTool.errors.join(', '),
  );

  const config = summarizeChannelTool.config;

  assert.equal(config.name, 'summarize-channel');
  assert.equal(config.universalIdentifier, LOGIC_FUNCTION_IDS.summarizeChannel);
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('summarize-channel takes a channel id, with optional thread and limit', () => {
  const inputSchema = summarizeChannelTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['channelId']);
  assert.equal(inputSchema?.properties?.channelId?.type, 'string');
  assert.equal(inputSchema?.properties?.threadParentId?.type, 'string');
  assert.equal(inputSchema?.properties?.maxMessages?.type, 'number');
});

test('catch-me-up is declared as a native AI tool', () => {
  assert.equal(
    catchMeUpTool.success,
    true,
    catchMeUpTool.errors.join(', '),
  );

  const config = catchMeUpTool.config;

  assert.equal(config.name, 'catch-me-up');
  assert.equal(config.universalIdentifier, LOGIC_FUNCTION_IDS.catchMeUp);
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('catch-me-up takes a channel id, with an optional explicit since date', () => {
  const inputSchema = catchMeUpTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['channelId']);
  assert.equal(inputSchema?.properties?.channelId?.type, 'string');
  assert.equal(inputSchema?.properties?.sinceIso?.type, 'string');
});
