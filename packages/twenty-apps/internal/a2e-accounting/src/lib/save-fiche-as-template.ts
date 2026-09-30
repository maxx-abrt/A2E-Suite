// Workspace fiche templates (PLAN M9b).
//
// The reverse of a fiche descriptor instantiation: promote an existing fiche to
// a reusable workspace template. Payload construction only: the caller owns
// persistence, so editing a copy never mutates the template and deleting the
// template never touches existing instances (C1: fresh rows, no aliasing).
//
// One implementation pattern, shared with a2e-documents'
// save-document-as-template.ts and a2e-projects' save-project-as-template.ts: a
// prefix-once title helper, one persisted marker (`isTemplate` on the existing
// fiche object), and a fresh copy in the instantiate direction.

export const FICHE_TEMPLATE_TITLE_PREFIX = 'Modèle — ';

const FALLBACK_FICHE_TITLE = 'Nouvelle fiche';

// Instance state (status, submission/approval dates, exports, requested amount
// and the saved-subvention link) never enters a template: those belong to one
// live fiche. Only the layout — the template key, the labels and the stored
// `data` payload — is reusable.
export type SourceFiche = {
  title: string;
  templateKey?: string | null;
  subtitle?: string | null;
  locale?: string | null;
  fiscalYear?: string | null;
  data?: Record<string, unknown> | null;
};

export type FicheTemplatePayload = {
  title: string;
  templateKey: string | null;
  subtitle: string | null;
  locale: string | null;
  fiscalYear: string | null;
  data: Record<string, unknown>;
  isTemplate: true;
};

export type InstantiatedFichePayload = {
  title: string;
  templateKey: string | null;
  subtitle: string | null;
  locale: string | null;
  fiscalYear: string | null;
  data: Record<string, unknown>;
  isTemplate: false;
};

const cloneFicheData = (
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> =>
  data === null || data === undefined
    ? {}
    : (JSON.parse(JSON.stringify(data)) as Record<string, unknown>);

// An already-prefixed title stays unchanged, so promoting a template-shaped
// fiche never doubles the prefix.
export const buildSaveFicheAsTemplateTitle = (sourceTitle: string): string => {
  const trimmedTitle = sourceTitle.trim();

  if (trimmedTitle === '') {
    return `${FICHE_TEMPLATE_TITLE_PREFIX}${FALLBACK_FICHE_TITLE}`;
  }

  if (trimmedTitle.startsWith(FICHE_TEMPLATE_TITLE_PREFIX)) {
    return trimmedTitle;
  }

  return `${FICHE_TEMPLATE_TITLE_PREFIX}${trimmedTitle}`;
};

export const buildFicheTemplateCopyTitle = (
  templateTitle: string,
): string => {
  const strippedTitle = templateTitle.startsWith(FICHE_TEMPLATE_TITLE_PREFIX)
    ? templateTitle.slice(FICHE_TEMPLATE_TITLE_PREFIX.length).trim()
    : templateTitle.trim();

  return strippedTitle === '' ? FALLBACK_FICHE_TITLE : strippedTitle;
};

export const buildSaveFicheAsTemplatePayload = (
  sourceFiche: SourceFiche,
): FicheTemplatePayload => ({
  title: buildSaveFicheAsTemplateTitle(sourceFiche.title),
  templateKey: sourceFiche.templateKey ?? null,
  subtitle: sourceFiche.subtitle ?? null,
  locale: sourceFiche.locale ?? null,
  fiscalYear: sourceFiche.fiscalYear ?? null,
  data: cloneFicheData(sourceFiche.data),
  isTemplate: true,
});

// Instantiate direction: the copy is a fresh, non-template fiche. `data` is
// deep-cloned so editing the copy's payload never mutates the template's, and
// the prefix is stripped from the title.
export const buildFicheFromTemplatePayload = (
  template: FicheTemplatePayload,
): InstantiatedFichePayload => ({
  title: buildFicheTemplateCopyTitle(template.title),
  templateKey: template.templateKey,
  subtitle: template.subtitle,
  locale: template.locale,
  fiscalYear: template.fiscalYear,
  data: cloneFicheData(template.data),
  isTemplate: false,
});
