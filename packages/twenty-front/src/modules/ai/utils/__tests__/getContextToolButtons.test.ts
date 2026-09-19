import { ToolCategory } from 'twenty-shared/ai';

import {
  buildLogicFunctionToolName,
  getContextToolButtons,
  humanizeToolLabel,
} from '@/ai/utils/getContextToolButtons';

const DOCUMENTS_APP_ID = 'documents-app-id';
const DRIVE_APP_ID = 'drive-app-id';

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
