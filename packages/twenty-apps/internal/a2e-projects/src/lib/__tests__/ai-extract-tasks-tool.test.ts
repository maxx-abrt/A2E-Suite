import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOGIC_FUNCTION_IDS } from '../../constants/universal-identifiers.ts';
import extractTasksTool from '../../logic-functions/extract-tasks-from-document.logic-function.ts';

// P4.3 AI seed: the « extract tasks from document » tool is registered on the
// native tool registry the only supported way — a logic function carrying
// `toolTriggerSettings` (P1.5 / P9.1 rule). The live assistant consumption is
// P9; here we pin registration + inertness so no earlier phase can silently
// turn the stub into an unreviewed write path.

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

test('the stub is inert: no task is proposed, nothing is created', async () => {
  const result = await extractTasksTool.config.handler({
    documentId: 'document-1',
    projectId: 'project-1',
  });

  assert.deepEqual(result, {
    status: 'STUB_NOT_IMPLEMENTED',
    documentId: 'document-1',
    projectId: 'project-1',
    tasks: [],
  });
});

test('the stub defaults the optional project to null', async () => {
  const result = await extractTasksTool.config.handler({
    documentId: 'document-1',
  });

  assert.equal(result.status, 'STUB_NOT_IMPLEMENTED');
  assert.equal(result.projectId, null);
  assert.deepEqual(result.tasks, []);
});
