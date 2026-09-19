// Universal identifiers for A2E CRM.
//
// A2E Documents owns c31a*, A2E Projects c31b*, A2E Chat c31c* and A2E Drive
// c31d*, so CRM claims the next free block, c31e*. The app owns no workspace
// object: it is a read-only action host for the native CRM domain (company,
// person, messageThread), registered through `toolTriggerSettings` (P1.5), so
// only app-level identifiers exist:
//   c31e0000-{family}-4000-8000-0000000000{NN}
//   0000 application / role · 0012 logic function

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'c31e0000-0000-4000-8000-000000000000';

// The tools run under the caller's auth context (CoreApiClient), so the app
// role exists only to let those reads resolve; it never grants a write, which
// keeps the "review before any commit" contract true at the role layer too.
export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  'c31e0000-0000-4000-8000-000000000001';

export const LOGIC_FUNCTION_IDS = {
  // P9.2 read-only AI tools: email reply drafts + record enrichment assist.
  draftEmailReply: 'c31e0000-0012-4000-8000-000000000001',
  assistRecordEnrichment: 'c31e0000-0012-4000-8000-000000000002',
} as const;
