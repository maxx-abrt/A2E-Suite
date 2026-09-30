import { type ViewManifest } from 'twenty-shared/application';

// Workspace board-view templates (PLAN M9b).
//
// A view's layout lives in its manifest: type, grouped-by field, visible
// fields, filters, filter groups, kanban groups and sorts. Saving a board view
// as a template is therefore payload construction only — the template is the
// view manifest marked as a template, and a caller-owned copy is what gets
// persisted. Editing a copy never mutates the template and deleting the
// template never touches instances (C1: fresh rows, no aliasing).
//
// The core `view` object carries no app-owned column, so unlike the project and
// fiche markers (an `isTemplate` field on the app object) the view template
// marker is part of this payload contract plus the prefix-once name; the
// persistence slice maps both. Same pattern as save-project-as-template.ts.

export const BOARD_VIEW_TEMPLATE_TITLE_PREFIX = 'Modèle — ';

const FALLBACK_VIEW_NAME = 'Tableau';

export type BoardViewTemplateViewPayload = ViewManifest & { isTemplate: true };

export type SavedBoardViewTemplate = {
  view: BoardViewTemplateViewPayload;
};

export type InstantiatedBoardViewPayload = ViewManifest & {
  isTemplate: false;
};

const createRandomUniversalIdentifier = (): string => {
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;

  if (typeof cryptoLike?.randomUUID === 'function') {
    return cryptoLike.randomUUID();
  }

  return `view-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
};

// A view manifest is plain JSON (no functions, no dates), so a JSON round-trip
// is a total deep clone and keeps the template independent from the source's
// arrays. Mirrors the "copy, never alias" rule of the document instantiation.
const cloneViewManifest = (view: ViewManifest): ViewManifest =>
  JSON.parse(JSON.stringify(view)) as ViewManifest;

export const buildSaveBoardViewAsTemplateTitle = (
  sourceName: string,
): string => {
  const trimmedName = sourceName.trim();

  if (trimmedName === '') {
    return `${BOARD_VIEW_TEMPLATE_TITLE_PREFIX}${FALLBACK_VIEW_NAME}`;
  }

  if (trimmedName.startsWith(BOARD_VIEW_TEMPLATE_TITLE_PREFIX)) {
    return trimmedName;
  }

  return `${BOARD_VIEW_TEMPLATE_TITLE_PREFIX}${trimmedName}`;
};

export const buildBoardViewTemplateCopyTitle = (
  templateName: string,
): string => {
  const strippedName = templateName.startsWith(BOARD_VIEW_TEMPLATE_TITLE_PREFIX)
    ? templateName.slice(BOARD_VIEW_TEMPLATE_TITLE_PREFIX.length).trim()
    : templateName.trim();

  return strippedName === '' ? FALLBACK_VIEW_NAME : strippedName;
};

export const buildSaveBoardViewAsTemplatePayload = (
  view: ViewManifest,
): SavedBoardViewTemplate => ({
  view: {
    ...cloneViewManifest(view),
    name: buildSaveBoardViewAsTemplateTitle(view.name),
    isTemplate: true,
  },
});

// Instantiate direction: every universal identifier in the manifest is
// re-minted — the view itself and its nested fields, filter groups, filters,
// groups and sorts — and every group reference is rewritten through the map,
// so the copy never aliases the template's metadata rows. A reference to a
// group the template did not carry is dropped rather than left dangling.
export const buildBoardViewFromTemplatePayload = (
  template: SavedBoardViewTemplate,
  options: { createUniversalIdentifier?: () => string } = {},
): InstantiatedBoardViewPayload => {
  const createUniversalIdentifier =
    options.createUniversalIdentifier ?? createRandomUniversalIdentifier;
  const mint = (): string => createUniversalIdentifier();

  const viewUniversalIdentifier = mint();
  const filterGroupIds = new Map<string, string>();

  for (const filterGroup of template.view.filterGroups ?? []) {
    filterGroupIds.set(filterGroup.universalIdentifier, mint());
  }

  const fieldGroupIds = new Map<string, string>();

  for (const fieldGroup of template.view.fieldGroups ?? []) {
    fieldGroupIds.set(fieldGroup.universalIdentifier, mint());
  }

  const copyView: InstantiatedBoardViewPayload = {
    ...cloneViewManifest(template.view),
    universalIdentifier: viewUniversalIdentifier,
    name: buildBoardViewTemplateCopyTitle(template.view.name),
    isTemplate: false,
  };

  if (copyView.fields !== undefined) {
    copyView.fields = copyView.fields.map((field) => {
      const { viewFieldGroupUniversalIdentifier, ...rest } = field;
      const groupId =
        viewFieldGroupUniversalIdentifier === undefined
          ? undefined
          : fieldGroupIds.get(viewFieldGroupUniversalIdentifier);

      return {
        ...rest,
        universalIdentifier: mint(),
        ...(groupId === undefined
          ? {}
          : { viewFieldGroupUniversalIdentifier: groupId }),
      };
    });
  }

  if (copyView.filterGroups !== undefined) {
    copyView.filterGroups = copyView.filterGroups.map((filterGroup) => {
      const { parentViewFilterGroupUniversalIdentifier, ...rest } = filterGroup;
      const parentId =
        parentViewFilterGroupUniversalIdentifier === undefined
          ? undefined
          : filterGroupIds.get(parentViewFilterGroupUniversalIdentifier);

      return {
        ...rest,
        universalIdentifier:
          filterGroupIds.get(filterGroup.universalIdentifier) ?? mint(),
        ...(parentId === undefined
          ? {}
          : { parentViewFilterGroupUniversalIdentifier: parentId }),
      };
    });
  }

  if (copyView.filters !== undefined) {
    copyView.filters = copyView.filters.map((filter) => {
      const { viewFilterGroupUniversalIdentifier, ...rest } = filter;
      const groupId =
        viewFilterGroupUniversalIdentifier === undefined
          ? undefined
          : filterGroupIds.get(viewFilterGroupUniversalIdentifier);

      return {
        ...rest,
        universalIdentifier: mint(),
        ...(groupId === undefined
          ? {}
          : { viewFilterGroupUniversalIdentifier: groupId }),
      };
    });
  }

  if (copyView.groups !== undefined) {
    copyView.groups = copyView.groups.map((group) => ({
      ...group,
      universalIdentifier: mint(),
    }));
  }

  if (copyView.sorts !== undefined) {
    copyView.sorts = copyView.sorts.map((sort) => ({
      ...sort,
      universalIdentifier: mint(),
    }));
  }

  return copyView;
};
