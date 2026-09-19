import { resolveFirstOpenHelpContext } from '@/first-open-help/utils/resolveFirstOpenHelpContext';

describe('resolveFirstOpenHelpContext', () => {
  it('maps the drive and document routes to the documents context', () => {
    expect(resolveFirstOpenHelpContext('/drive')).toBe('DOCUMENTS');
    expect(resolveFirstOpenHelpContext('/objects/document')).toBe('DOCUMENTS');
    expect(resolveFirstOpenHelpContext('/object/document/abc')).toBe(
      'DOCUMENTS',
    );
  });

  it('maps the task and project routes to the tasks context', () => {
    expect(resolveFirstOpenHelpContext('/objects/tasks')).toBe('TASKS');
    expect(resolveFirstOpenHelpContext('/objects/projects')).toBe('TASKS');
    expect(resolveFirstOpenHelpContext('/object/task/abc')).toBe('TASKS');
  });

  it('falls back to the workspace context for anything else', () => {
    expect(resolveFirstOpenHelpContext('/')).toBe('WORKSPACE');
    expect(resolveFirstOpenHelpContext('/objects/companies')).toBe('WORKSPACE');
  });

  it('does not match a route that merely shares a prefix', () => {
    expect(resolveFirstOpenHelpContext('/object/documenters')).toBe(
      'WORKSPACE',
    );
  });
});
