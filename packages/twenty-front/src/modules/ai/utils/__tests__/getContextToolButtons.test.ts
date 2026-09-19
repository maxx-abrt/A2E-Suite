import { ToolCategory } from 'twenty-shared/ai';

import {
  buildLogicFunctionToolName,
  getContextToolButtons,
  humanizeToolLabel,
  toolInputSchemaReferencesObject,
} from '@/ai/utils/getContextToolButtons';

const DOCUMENTS_APP_ID = 'documents-app-id';
const DRIVE_APP_ID = 'drive-app-id';
const PROJECTS_APP_ID = 'projects-app-id';

const DOCUMENT_UNIVERSAL_IDENTIFIER = '20202020-document-universal-id';

const documentContentTool = {
  name: 'app_document_content',
  label: 'document-content',
  description: 'Lit le contenu autorisé d’un document.',
  category: ToolCategory.LOGIC_FUNCTION,
};

const findFileTool = {
  name: 'app_find_file',
  label: 'find-file',
  description: 'Cherche des fichiers Drive.',
  category: ToolCategory.LOGIC_FUNCTION,
};

const documentContentLogicFunction = {
  name: 'document-content',
  applicationId: DOCUMENTS_APP_ID,
};

const findFileLogicFunction = {
  name: 'find-file',
  applicationId: DRIVE_APP_ID,
};

const defaultArguments = {
  toolIndex: [documentContentTool, findFileTool],
  logicFunctions: [documentContentLogicFunction, findFileLogicFunction],
  installedApplicationIds: new Set([DOCUMENTS_APP_ID, DRIVE_APP_ID]),
  context: { applicationId: DOCUMENTS_APP_ID },
  canReadContextObject: true,
};

const extractTasksTool = {
  name: 'app_extract_tasks_from_document',
  label: 'extract-tasks-from-document',
  description: 'Propose des tâches à partir d’un document.',
  category: ToolCategory.LOGIC_FUNCTION,
};

const extractTasksLogicFunction = {
  name: 'extract-tasks-from-document',
  applicationId: PROJECTS_APP_ID,
  inputSchema: {
    type: 'object',
    properties: {
      documentId: { type: 'string' },
      projectId: { type: 'string' },
    },
    required: ['documentId'],
  },
};

const documentContext = {
  applicationId: DOCUMENTS_APP_ID,
  objectNameSingular: 'document',
  objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
};

describe('getContextToolButtons', () => {
  it('offers the read-only tools of the app that owns the current context', () => {
    const buttons = getContextToolButtons(defaultArguments);

    expect(buttons).toEqual([
      {
        toolName: 'app_document_content',
        label: 'Document Content',
        description: 'Lit le contenu autorisé d’un document.',
        applicationId: DOCUMENTS_APP_ID,
        readOnly: true,
        requiresConfirmation: false,
      },
    ]);
  });

  it('maps the same registry tool to the drive app when the drive app owns the view', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      context: { applicationId: DRIVE_APP_ID },
    });

    expect(buttons.map(({ toolName }) => toolName)).toEqual(['app_find_file']);
  });

  it('offers nothing without a current context', () => {
    expect(
      getContextToolButtons({ ...defaultArguments, context: null }),
    ).toEqual([]);
  });

  it('offers nothing when the caller cannot read the context object', () => {
    expect(
      getContextToolButtons({
        ...defaultArguments,
        canReadContextObject: false,
      }),
    ).toEqual([]);
  });

  it('offers nothing when the context has no resolvable owning app', () => {
    expect(
      getContextToolButtons({
        ...defaultArguments,
        context: { applicationId: null },
      }),
    ).toEqual([]);
  });

  it('drops a tool whose owning logic function cannot be resolved (fail-closed)', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      logicFunctions: [],
    });

    expect(buttons).toEqual([]);
  });

  it('drops a tool whose app is not installed (fail-closed)', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      installedApplicationIds: new Set(),
    });

    expect(buttons).toEqual([]);
  });

  it('drops a tool whose logic function has no application (fail-closed)', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      logicFunctions: [{ name: 'document-content', applicationId: null }],
    });

    expect(buttons).toEqual([]);
  });

  it('never offers mutating registry categories as read-only context buttons', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      toolIndex: [
        {
          name: 'create_one_document',
          label: 'create_one_document',
          description: 'Creates a document.',
          category: ToolCategory.DATABASE_CRUD,
        },
        {
          name: 'send_email',
          label: 'send_email',
          description: 'Sends an email.',
          category: ToolCategory.ACTION,
        },
      ],
      logicFunctions: [
        { name: 'create_one_document', applicationId: DOCUMENTS_APP_ID },
        { name: 'send_email', applicationId: DOCUMENTS_APP_ID },
      ],
    });

    expect(buttons).toEqual([]);
  });

  it('deduplicates a tool exposed twice and sorts the buttons by label', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      toolIndex: [
        documentContentTool,
        documentContentTool,
        {
          name: 'app_standup_digest',
          label: 'standup-digest',
          description: 'Résume l’activité.',
          category: ToolCategory.LOGIC_FUNCTION,
        },
      ],
      logicFunctions: [
        documentContentLogicFunction,
        { name: 'standup-digest', applicationId: DOCUMENTS_APP_ID },
      ],
    });

    expect(buttons.map(({ toolName }) => toolName)).toEqual([
      'app_document_content',
      'app_standup_digest',
    ]);
  });

  it('offers another app’s read-only tool when its input schema addresses the context object', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      context: documentContext,
      toolIndex: [...defaultArguments.toolIndex, extractTasksTool],
      logicFunctions: [
        ...defaultArguments.logicFunctions,
        extractTasksLogicFunction,
      ],
      installedApplicationIds: new Set([
        DOCUMENTS_APP_ID,
        DRIVE_APP_ID,
        PROJECTS_APP_ID,
      ]),
    });

    expect(buttons.map(({ toolName }) => toolName)).toEqual([
      'app_document_content',
      'app_extract_tasks_from_document',
    ]);
  });

  it('matches a record reference declared by object universal identifier', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      context: {
        applicationId: null,
        objectNameSingular: 'document',
        objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
      },
      toolIndex: [extractTasksTool],
      logicFunctions: [
        {
          name: 'extract-tasks-from-document',
          applicationId: PROJECTS_APP_ID,
          inputSchema: {
            type: 'object',
            properties: {
              document: {
                type: 'record',
                objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
              },
            },
          },
        },
      ],
      installedApplicationIds: new Set([PROJECTS_APP_ID]),
    });

    expect(buttons.map(({ toolName }) => toolName)).toEqual([
      'app_extract_tasks_from_document',
    ]);
  });

  it('does not offer an app tool whose input schema addresses a different object', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      context: documentContext,
      toolIndex: [
        {
          name: 'app_task_breakdown_context',
          label: 'task-breakdown-context',
          description: 'Structure des tâches d’un projet.',
          category: ToolCategory.LOGIC_FUNCTION,
        },
      ],
      logicFunctions: [
        {
          name: 'task-breakdown-context',
          applicationId: PROJECTS_APP_ID,
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
      ],
      installedApplicationIds: new Set([PROJECTS_APP_ID]),
    });

    expect(buttons).toEqual([]);
  });

  it('does not offer another app’s tool when its app is not installed (fail-closed)', () => {
    const buttons = getContextToolButtons({
      ...defaultArguments,
      context: documentContext,
      toolIndex: [...defaultArguments.toolIndex, extractTasksTool],
      logicFunctions: [
        ...defaultArguments.logicFunctions,
        extractTasksLogicFunction,
      ],
      installedApplicationIds: new Set([DOCUMENTS_APP_ID, DRIVE_APP_ID]),
    });

    expect(buttons.map(({ toolName }) => toolName)).toEqual([
      'app_document_content',
    ]);
  });
});

describe('toolInputSchemaReferencesObject', () => {
  it('matches a singular or plural record-id property named after the object', () => {
    expect(
      toolInputSchemaReferencesObject({
        inputSchema: {
          type: 'object',
          properties: { documentId: { type: 'string' } },
        },
        objectNameSingular: 'document',
      }),
    ).toBe(true);

    expect(
      toolInputSchemaReferencesObject({
        inputSchema: {
          type: 'object',
          properties: { projectIds: { type: 'array' } },
        },
        objectNameSingular: 'project',
      }),
    ).toBe(true);
  });

  it('matches a nested record reference by object universal identifier', () => {
    expect(
      toolInputSchemaReferencesObject({
        inputSchema: {
          type: 'object',
          properties: {
            payload: {
              type: 'object',
              properties: {
                document: {
                  type: 'record',
                  objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
                },
              },
            },
          },
        },
        objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
      }),
    ).toBe(true);
  });

  it('matches a record reference inside array items', () => {
    expect(
      toolInputSchemaReferencesObject({
        inputSchema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              items: {
                type: 'record',
                objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
              },
            },
          },
        },
        objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
      }),
    ).toBe(true);
  });

  it('fails closed without a usable schema or object reference', () => {
    const documentContextReference = {
      objectNameSingular: 'document',
      objectUniversalIdentifier: DOCUMENT_UNIVERSAL_IDENTIFIER,
    };

    expect(
      toolInputSchemaReferencesObject({
        inputSchema: undefined,
        ...documentContextReference,
      }),
    ).toBe(false);
    expect(
      toolInputSchemaReferencesObject({
        inputSchema: 'not-a-schema',
        ...documentContextReference,
      }),
    ).toBe(false);
    expect(
      toolInputSchemaReferencesObject({
        inputSchema: {
          type: 'object',
          properties: { projectId: { type: 'string' } },
        },
        ...documentContextReference,
      }),
    ).toBe(false);
  });
});

describe('buildLogicFunctionToolName', () => {
  it('mirrors the server naming for hyphenated and cased names', () => {
    expect(buildLogicFunctionToolName('document-content')).toBe(
      'app_document_content',
    );
    expect(buildLogicFunctionToolName('catch-me-up')).toBe('app_catch_me_up');
    expect(buildLogicFunctionToolName('Standup Digest')).toBe(
      'app_standup_digest',
    );
  });
});

describe('humanizeToolLabel', () => {
  it('turns a registry tool label into a button label', () => {
    expect(humanizeToolLabel('document-content')).toBe('Document Content');
    expect(humanizeToolLabel('standup_digest')).toBe('Standup Digest');
  });
});
