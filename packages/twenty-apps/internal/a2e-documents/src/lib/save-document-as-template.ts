import { DOCUMENT_KIND } from '../constants/field-vocabulary.ts';
import {
  DEFAULT_TEMPLATE_COPY_POSITION,
  TEMPLATE_TITLE_PREFIX,
} from './instantiate-template.ts';

// The reverse of instantiate-template: promote an existing document to a
// workspace content template, or duplicate a template as a template. Payload
// construction only — the caller owns persistence, so editing the source
// document never mutates the template and deleting the template never touches
// existing documents (C1: fresh record, no aliasing).

type SourceDocument = {
  title: string;
  content?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
};

export type SaveAsTemplatePayload = {
  title: string;
  kind: string;
  position: string;
  content: {
    blocknote: string | null;
    markdown: string | null;
  };
};

// An already-prefixed title stays unchanged, so promoting a template-shaped
// document never doubles the prefix.
export const buildSaveAsTemplateTitle = (sourceTitle: string): string => {
  const trimmedTitle = sourceTitle.trim();

  if (trimmedTitle === '') {
    return `${TEMPLATE_TITLE_PREFIX}Nouveau document`;
  }

  if (trimmedTitle.startsWith(TEMPLATE_TITLE_PREFIX)) {
    return trimmedTitle;
  }

  return `${TEMPLATE_TITLE_PREFIX}${trimmedTitle}`;
};

export const buildSaveAsTemplatePayload = (
  sourceDocument: SourceDocument,
  options: { position?: string } = {},
): SaveAsTemplatePayload => ({
  title: buildSaveAsTemplateTitle(sourceDocument.title),
  kind: DOCUMENT_KIND.TEMPLATE,
  position: options.position ?? DEFAULT_TEMPLATE_COPY_POSITION,
  content: {
    blocknote: sourceDocument.content?.blocknote ?? null,
    markdown: sourceDocument.content?.markdown ?? null,
  },
});

export const buildTemplateDuplicateTitle = (templateTitle: string): string =>
  `${buildSaveAsTemplateTitle(templateTitle)} (copie)`;

export const buildTemplateDuplicatePayload = (
  templateDocument: SourceDocument,
  options: { position?: string } = {},
): SaveAsTemplatePayload => ({
  ...buildSaveAsTemplatePayload(templateDocument, options),
  title: buildTemplateDuplicateTitle(templateDocument.title),
});
