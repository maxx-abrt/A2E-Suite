import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';

// Template instantiation is payload construction only: the copy is a fresh
// DOCUMENT record whose content is the template's, verbatim. The caller owns
// persistence, so this stays free of transport concerns and unit-testable.

type TemplateDocument = {
  id: string;
  title: string;
  content?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
};

export type TemplateCopyPayload = {
  title: string;
  kind: string;
  position: string;
  content: {
    blocknote: string | null;
    markdown: string | null;
  };
};

const TEMPLATE_TITLE_PREFIX = 'Modèle — ';

// Same opening position the browser uses for every new root document; callers
// pass a fractional index (twenty-shared generateFractionalIndexBetween) when
// they want deterministic interleaving instead.
export const DEFAULT_TEMPLATE_COPY_POSITION = 'V';

export const buildTemplateCopyTitle = (templateTitle: string): string => {
  const strippedTitle = templateTitle.startsWith(TEMPLATE_TITLE_PREFIX)
    ? templateTitle.slice(TEMPLATE_TITLE_PREFIX.length).trim()
    : templateTitle.trim();

  return strippedTitle === '' ? 'Nouveau document' : strippedTitle;
};

export const buildTemplateCopyPayload = (
  template: TemplateDocument,
  options: { position?: string } = {},
): TemplateCopyPayload => ({
  title: buildTemplateCopyTitle(template.title),
  kind: DOCUMENT_KIND.DOCUMENT,
  position: options.position ?? DEFAULT_TEMPLATE_COPY_POSITION,
  content: {
    blocknote: template.content?.blocknote ?? null,
    markdown: template.content?.markdown ?? null,
  },
});
