import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import documentContentTool from '../../logic-functions/document-content.logic-function.ts';

// The « document content » tool registers on the native tool registry the only
// supported way — a logic function carrying `toolTriggerSettings` (P1.5 / P9.1
// rule). No `registerAiTools`, no bespoke table, no manual hook. The read
// behaviour itself is pinned in `document-content-handler.test.ts`.

const LOGIC_FUNCTION_REGISTRY = Object.values(LOGIC_FUNCTION_IDS) as string[];

test('document-content is declared as a native AI tool', () => {
  assert.equal(
    documentContentTool.success,
    true,
    documentContentTool.errors.join(', '),
  );

  const config = documentContentTool.config;

  assert.equal(config.name, 'document-content');
  assert.equal(config.universalIdentifier, LOGIC_FUNCTION_IDS.documentContent);
  assert.ok(
    LOGIC_FUNCTION_REGISTRY.includes(config.universalIdentifier),
    `${config.universalIdentifier} is not in LOGIC_FUNCTION_IDS`,
  );
  assert.ok(
    config.toolTriggerSettings,
    'the tool must register through toolTriggerSettings (no custom hook)',
  );
});

test('the tool input is a document id, with optional metadata', () => {
  const inputSchema =
    documentContentTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['documentId']);
  assert.equal(inputSchema?.properties?.documentId?.type, 'string');
  assert.equal(inputSchema?.properties?.includeMetadata?.type, 'boolean');
});
