// C1 — the template-apply result contract (PLAN M9a / US-131).
//
// The gallery's "Use template" write path calls the owning app's apply logic
// function keyed by the descriptor key. The app owns the write; this shape is
// what crosses the logic-function boundary back to the gallery, so the surface
// can render either the created records or a typed, renderable rejection —
// never a partial apply and never a raw string error.

// The closed set of reasons an apply refuses to write. `UNKNOWN_TEMPLATE_KEY`
// and `MISSING_REQUIRED_APP` are gallery-renderable safe states; `MISSING_INPUT`
// maps to the descriptor's `required` inputs; `APPLY_FAILED` is the honest
// fallback when the write itself did not complete.
export type TemplateApplyErrorCode =
  | 'UNKNOWN_TEMPLATE_KEY'
  | 'MISSING_REQUIRED_APP'
  | 'MISSING_INPUT'
  | 'APPLY_FAILED';

// One row the apply created. `object` is the target object's name_singular
// (the same identity the descriptor preview names), `id` is the fresh id.
export type TemplateApplyCreatedRecord = {
  object: string;
  id: string;
};

export type TemplateApplyApplied = {
  status: 'applied';
  key: string;
  version: number;
  // Echoed back so a retried call can correlate; null when the caller did not
  // supply an idempotency id.
  operationId: string | null;
  created: TemplateApplyCreatedRecord[];
};

export type TemplateApplyRejected = {
  status: 'rejected';
  key: string;
  errorCode: TemplateApplyErrorCode;
  message: string;
};

export type TemplateApplyResult = TemplateApplyApplied | TemplateApplyRejected;

// The installed-app facts an apply validates `requiredApps` against. An app is
// satisfied when the requirement matches either its display name or its
// universal identifier, so a descriptor authored with either identity works.
export type TemplateApplyInstalledApplications = {
  names: string[];
  universalIdentifiers: string[];
};

export type TemplateApplyRequestRejection = {
  errorCode: TemplateApplyErrorCode;
  message: string;
};
