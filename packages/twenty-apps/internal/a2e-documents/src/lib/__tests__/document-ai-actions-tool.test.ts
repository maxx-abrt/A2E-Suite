import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import improveDocumentWritingTool from '../../logic-functions/improve-document-writing.logic-function.ts';
import summarizeDocumentTool from '../../logic-functions/summarize-document.logic-function.ts';
import translateDocumentTool from '../../logic-functions/translate-document.logic-function.ts';

// The three P9.2 document actions register on the native tool registry the only
// supported way — a logic function carrying `toolTriggerSettings` (P1.5 / P9.1
// rule). No `registerAiTools`, no bespoke table, no manual hook. The read
// behaviour and fail-closed denial are pinned in
// `document-ai-actions-handler.test.ts`.

const LOGIC_FUNCTION_REGISTRY = Object.values(LOGIC_FUNCTION_IDS) as string[];

const assertRegistersAsTool = (
  tool: typeof summarizeDocumentTool,
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

test('summarize-document is declared as a native AI tool', () => {
  assertRegistersAsTool(
    summarizeDocumentTool,
    'summarize-document',
    LOGIC_FUNCTION_IDS.summarizeDocument,
  );

  const inputSchema =
    summarizeDocumentTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['documentId']);
  assert.equal(inputSchema?.properties?.documentId?.type, 'string');
  assert.equal(inputSchema?.properties?.maxWords?.type, 'number');
});

test('translate-document is declared as a native AI tool', () => {
  assertRegistersAsTool(
    translateDocumentTool,
    'translate-document',
    LOGIC_FUNCTION_IDS.translateDocument,
  );

  const inputSchema =
    translateDocumentTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  // The target language is mandatory: a translation cannot be dispatched
  // without it.
  assert.deepEqual(inputSchema?.required, ['documentId', 'targetLanguage']);
  assert.equal(inputSchema?.properties?.documentId?.type, 'string');
  assert.equal(inputSchema?.properties?.targetLanguage?.type, 'string');
  assert.equal(inputSchema?.properties?.tone?.type, 'string');
});

test('improve-document-writing is declared as a native AI tool', () => {
  assertRegistersAsTool(
    improveDocumentWritingTool,
    'improve-document-writing',
    LOGIC_FUNCTION_IDS.improveDocumentWriting,
  );

  const inputSchema =
    improveDocumentWritingTool.config.toolTriggerSettings?.inputSchema;

  assert.equal(inputSchema?.type, 'object');
  assert.deepEqual(inputSchema?.required, ['documentId']);
  assert.equal(inputSchema?.properties?.documentId?.type, 'string');
  assert.equal(inputSchema?.properties?.tone?.type, 'string');
});

test('every action addresses the document object so it surfaces on a record', () => {
  const tools = [
    summarizeDocumentTool,
    translateDocumentTool,
    improveDocumentWritingTool,
  ];

  for (const tool of tools) {
    const properties =
      tool.config.toolTriggerSettings?.inputSchema?.properties ?? {};

    assert.ok(
      properties.documentId,
      `${tool.config.name} must take a documentId to map to the document context`,
    );
  }
});
