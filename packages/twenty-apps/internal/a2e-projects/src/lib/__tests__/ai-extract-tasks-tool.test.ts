import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import extractTasksTool from '../../logic-functions/extract-tasks-from-document.logic-function.ts';

// The « extract tasks from document » tool is registered on the native tool
// registry the only supported way — a logic function carrying
// `toolTriggerSettings` (P1.5 / P9.1 rule). The extraction behaviour itself is
// pinned in `document-task-extraction.test.ts` (pure parser) and
// `extract-tasks-from-document-handler.test.ts` (caller-scoped read + result
// statuses); here we only pin registration and the input contract.

const LOGIC_FUNCTION_REGISTRY = Object.values(LOGIC_FUNCTION_IDS) as string[];

test('the extract-tasks tool is declared as a native AI tool', () => {
  assert.equal(
    extractTasksTool.success,
    true,
    extractTasksTool.errors.join(', '),
  );

  const config = extractTasksTool.config;

  assert.equal(config.name, 'extract-tasks-from-document');
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.equal(
    config.universalIdentifier,
    LOGIC_FUNCTION_IDS.extractTasksFromDocument,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('the tool input is a document id, with an optional target project', () => {
  const inputSchema = extractTasksTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['documentId']);
  assert.equal(inputSchema?.properties?.documentId?.type, 'string');
  assert.equal(inputSchema?.properties?.projectId?.type, 'string');
});
