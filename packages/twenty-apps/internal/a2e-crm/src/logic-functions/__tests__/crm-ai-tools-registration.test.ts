import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import assistRecordEnrichmentTool from '../assist-record-enrichment.logic-function.ts';
import draftEmailReplyTool from '../draft-email-reply.logic-function.ts';

// The two P9.2 CRM tools register on the native tool registry the only
// supported way — a logic function carrying `toolTriggerSettings` (P1.5 / P9.1
// rule). No `registerAiTools`, no bespoke table, no manual hook. The read
// behaviour and fail-closed denial are pinned in the handler specs.

const LOGIC_FUNCTION_REGISTRY = Object.values(LOGIC_FUNCTION_IDS) as string[];

const assertRegistersAsTool = (
  tool: typeof draftEmailReplyTool,
  name: string,
  universalIdentifier: string,
) => {
  assert.equal(tool.success, true, tool.errors.join(', '));

  const config = tool.config;

  assert.equal(config.name, name);
  assert.equal(config.universalIdentifier, universalIdentifier);
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
};

test('draft-email-reply is declared as a native AI tool', () => {
  assertRegistersAsTool(
    draftEmailReplyTool,
    'draft-email-reply',
    LOGIC_FUNCTION_IDS.draftEmailReply,
  );

  const inputSchema =
    draftEmailReplyTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['messageThreadId']);
  assert.equal(inputSchema?.properties?.messageThreadId?.type, 'string');
  assert.equal(inputSchema?.properties?.tone?.type, 'string');
  assert.equal(inputSchema?.properties?.language?.type, 'string');
  assert.equal(inputSchema?.properties?.maxWords?.type, 'number');
});

test('assist-record-enrichment is declared as a native AI tool', () => {
  assertRegistersAsTool(
    assistRecordEnrichmentTool,
    'assist-record-enrichment',
    LOGIC_FUNCTION_IDS.assistRecordEnrichment,
  );

  const inputSchema =
    assistRecordEnrichmentTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  // The target is chosen at runtime (exactly one of the two ids), so neither is
  // marked required in the schema.
  assert.equal(inputSchema?.required, undefined);
  assert.equal(inputSchema?.properties?.personId?.type, 'string');
  assert.equal(inputSchema?.properties?.companyId?.type, 'string');
});

test('every tool addresses a native CRM object so it surfaces on a record', () => {
  const tools = [
    {
      tool: draftEmailReplyTool,
      expectedProperty: 'messageThreadId',
    },
    {
      tool: assistRecordEnrichmentTool,
      expectedProperty: 'personId',
    },
  ];

  for (const { tool, expectedProperty } of tools) {
    const properties =
      tool.config.toolTriggerSettings?.inputSchema?.properties ?? {};

    assert.ok(
      properties[expectedProperty],
      `${tool.config.name} must take a ${expectedProperty} to map to its context`,
    );
  }
});
