import {
  A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
  buildNewPageCreatePlan,
  DOCUMENT_OBJECT_NAME_SINGULAR,
  isDocumentApplicationInstalled,
  UNTITLED_DOCUMENT_TITLE,
} from '@/quick-capture/utils/newPageDocument';

describe('buildNewPageCreatePlan', () => {
  it('plans an untitled document', () => {
    expect(buildNewPageCreatePlan()).toEqual({
      objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
      recordInput: { title: UNTITLED_DOCUMENT_TITLE },
    });
    expect(UNTITLED_DOCUMENT_TITLE).toBe('');
    expect(DOCUMENT_OBJECT_NAME_SINGULAR).toBe('document');
  });

  it('plans the page at the personal root, with no parent', () => {
    expect(buildNewPageCreatePlan().recordInput).not.toHaveProperty('parentId');
  });
});

describe('isDocumentApplicationInstalled', () => {
  it('is true when a2e-documents is installed', () => {
    expect(
      isDocumentApplicationInstalled([
        A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      ]),
    ).toBe(true);
  });

  it('is false when only other apps are installed', () => {
    expect(isDocumentApplicationInstalled(['some-other-app'])).toBe(false);
  });

  it('is false without any installed app', () => {
    expect(isDocumentApplicationInstalled([])).toBe(false);
  });
});
