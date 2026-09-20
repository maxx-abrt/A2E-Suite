import { ToolCategory } from 'twenty-shared/ai';

import { getContextToolButtons } from '@/ai/utils/getContextToolButtons';

// P9.1 prompt/action library — systematic per-app surfacing audit.
//
// One row per shipped read-only app tool (PLAN.md P9.2): the tool's registry
// name, the app that owns it, and the record page it must appear on. Each row
// runs the production `getContextToolButtons` with an app-less context (only
// the target object is known) so the assertion exercises the input-schema
// mapping the P9 contract names — `<objectNameSingular>Id` property or an
// `objectUniversalIdentifier` — never the owning-app shortcut. A tool that
// stops referencing its context object fails here instead of silently
// disappearing from the assistant.
//
// The input schemas mirror the app manifests
// (packages/twenty-apps/internal/a2e-*/src/logic-functions/*.logic-function.ts);
// the app packages pin the same references from their real definitions in
// their `*-ai-tools-registration` specs, so a schema edit breaks both sides.

const DOCUMENTS_APP_ID = 'documents-app-id';
const PROJECTS_APP_ID = 'projects-app-id';
const CHAT_APP_ID = 'chat-app-id';
const DRIVE_APP_ID = 'drive-app-id';
const CRM_APP_ID = 'crm-app-id';

const CHAT_CHANNEL_OBJECT_ID = 'c31c0100-0000-4000-8000-000000000000';
const DRIVE_FOLDER_OBJECT_ID = 'c31d0100-0000-4000-8000-000000000000';

const INSTALLED_APPLICATION_IDS = new Set([
  DOCUMENTS_APP_ID,
  PROJECTS_APP_ID,
  CHAT_APP_ID,
  DRIVE_APP_ID,
  CRM_APP_ID,
]);

type ShippedReadOnlyTool = {
  app: string;
  toolName: string;
  logicFunctionName: string;
  contextObjectNameSingular: string;
  contextObjectUniversalIdentifier?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
};

const SHIPPED_READ_ONLY_TOOLS: ShippedReadOnlyTool[] = [
  // a2e-documents
  {
    app: 'a2e-documents',
    toolName: 'app_document_content',
    logicFunctionName: 'document-content',
    contextObjectNameSingular: 'document',
    inputSchema: {
      type: 'object',
      properties: { documentId: { type: 'string' } },
      required: ['documentId'],
    },
  },
  {
    app: 'a2e-documents',
    toolName: 'app_summarize_document',
    logicFunctionName: 'summarize-document',
    contextObjectNameSingular: 'document',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        maxWords: { type: 'number' },
      },
      required: ['documentId'],
    },
  },
  {
    app: 'a2e-documents',
    toolName: 'app_translate_document',
    logicFunctionName: 'translate-document',
    contextObjectNameSingular: 'document',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        targetLanguage: { type: 'string' },
      },
      required: ['documentId', 'targetLanguage'],
    },
  },
  {
    app: 'a2e-documents',
    toolName: 'app_improve_document_writing',
    logicFunctionName: 'improve-document-writing',
    contextObjectNameSingular: 'document',
    inputSchema: {
      type: 'object',
      properties: { documentId: { type: 'string' }, tone: { type: 'string' } },
      required: ['documentId'],
    },
  },
  // a2e-projects
  {
    app: 'a2e-projects',
    toolName: 'app_standup_digest',
    logicFunctionName: 'standup-digest',
    contextObjectNameSingular: 'project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        sinceIso: { type: 'string' },
      },
    },
  },
  {
    app: 'a2e-projects',
    toolName: 'app_task_breakdown_context',
    logicFunctionName: 'task-breakdown-context',
    contextObjectNameSingular: 'project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    app: 'a2e-projects',
    toolName: 'app_extract_tasks_from_document',
    logicFunctionName: 'extract-tasks-from-document',
    contextObjectNameSingular: 'document',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        projectId: { type: 'string' },
      },
      required: ['documentId'],
    },
  },
  {
    app: 'a2e-projects',
    toolName: 'app_extract_tasks_from_document',
    logicFunctionName: 'extract-tasks-from-document',
    contextObjectNameSingular: 'project',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        projectId: { type: 'string' },
      },
      required: ['documentId'],
    },
  },
  // a2e-chat
  {
    app: 'a2e-chat',
    toolName: 'app_summarize_channel',
    logicFunctionName: 'summarize-channel',
    contextObjectNameSingular: 'chatChannel',
    contextObjectUniversalIdentifier: CHAT_CHANNEL_OBJECT_ID,
    inputSchema: {
      type: 'object',
      properties: {
        channelId: {
          type: 'string',
          objectUniversalIdentifier: CHAT_CHANNEL_OBJECT_ID,
        },
      },
      required: ['channelId'],
    },
  },
  {
    app: 'a2e-chat',
    toolName: 'app_catch_me_up',
    logicFunctionName: 'catch-me-up',
    contextObjectNameSingular: 'chatChannel',
    contextObjectUniversalIdentifier: CHAT_CHANNEL_OBJECT_ID,
    inputSchema: {
      type: 'object',
      properties: {
        channelId: {
          type: 'string',
          objectUniversalIdentifier: CHAT_CHANNEL_OBJECT_ID,
        },
      },
      required: ['channelId'],
    },
  },
  // a2e-drive
  {
    app: 'a2e-drive',
    toolName: 'app_find_file',
    logicFunctionName: 'find-file',
    contextObjectNameSingular: 'driveFolder',
    contextObjectUniversalIdentifier: DRIVE_FOLDER_OBJECT_ID,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        folderId: {
          type: 'string',
          objectUniversalIdentifier: DRIVE_FOLDER_OBJECT_ID,
        },
      },
      required: ['query'],
    },
  },
  {
    app: 'a2e-drive',
    toolName: 'app_dedupe_hints',
    logicFunctionName: 'dedupe-hints',
    contextObjectNameSingular: 'driveFolder',
    contextObjectUniversalIdentifier: DRIVE_FOLDER_OBJECT_ID,
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          type: 'string',
          objectUniversalIdentifier: DRIVE_FOLDER_OBJECT_ID,
        },
      },
    },
  },
  // a2e-crm
  {
    app: 'a2e-crm',
    toolName: 'app_draft_email_reply',
    logicFunctionName: 'draft-email-reply',
    contextObjectNameSingular: 'messageThread',
    inputSchema: {
      type: 'object',
      properties: { messageThreadId: { type: 'string' } },
      required: ['messageThreadId'],
    },
  },
  {
    app: 'a2e-crm',
    toolName: 'app_assist_record_enrichment',
    logicFunctionName: 'assist-record-enrichment',
    contextObjectNameSingular: 'person',
    inputSchema: {
      type: 'object',
      properties: { personId: { type: 'string' } },
    },
  },
  {
    app: 'a2e-crm',
    toolName: 'app_assist_record_enrichment',
    logicFunctionName: 'assist-record-enrichment',
    contextObjectNameSingular: 'company',
    inputSchema: {
      type: 'object',
      properties: { companyId: { type: 'string' } },
    },
  },
];

const APP_ID_BY_NAME: Record<string, string> = {
  'a2e-documents': DOCUMENTS_APP_ID,
  'a2e-projects': PROJECTS_APP_ID,
  'a2e-chat': CHAT_APP_ID,
  'a2e-drive': DRIVE_APP_ID,
  'a2e-crm': CRM_APP_ID,
};

describe('getContextToolButtons — per-app surfacing audit', () => {
  for (const shippedTool of SHIPPED_READ_ONLY_TOOLS) {
    const caseName = `${shippedTool.app}/${shippedTool.logicFunctionName} on ${shippedTool.contextObjectNameSingular}`;

    it(`${caseName} surfaces as a context button`, () => {
      const applicationId = APP_ID_BY_NAME[shippedTool.app];

      const buttons = getContextToolButtons({
        toolIndex: [
          {
            name: shippedTool.toolName,
            label: shippedTool.logicFunctionName,
            description: `${shippedTool.logicFunctionName} description`,
            category: ToolCategory.LOGIC_FUNCTION,
          },
        ],
        logicFunctions: [
          {
            name: shippedTool.logicFunctionName,
            applicationId,
            inputSchema: shippedTool.inputSchema,
          },
        ],
        installedApplicationIds: INSTALLED_APPLICATION_IDS,
        // App-less context: only the open record is known, so surfacing hinges
        // solely on the declared input-schema reference.
        context: {
          applicationId: null,
          objectNameSingular: shippedTool.contextObjectNameSingular,
          objectUniversalIdentifier:
            shippedTool.contextObjectUniversalIdentifier,
        },
        canReadContextObject: true,
      });

      expect(buttons.map(({ toolName }) => toolName)).toEqual([
        shippedTool.toolName,
      ]);
    });
  }
});
