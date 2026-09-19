import {
  coreClient,
  hasNonEmptyString,
  type CoreClientLike,
} from './crm-tool-support.ts';

// LECTURE SEULE, SOUS L'AUTORISATION DE L'APPELANT (P9.2).
//
// Reads a caller-authorized person or company record and reports its key
// identity fields plus the ones left empty, so the assistant can propose
// enrichment values for a human to review. This handler does NOT enrich: it
// never calls an enrichment provider and never writes (C6). Applying
// enrichment stays the job of the existing enrichment module (the
// `people-data-labs` app and the native company-enrichment module) so there is
// exactly one enrichment path, not a second bypass.
//
// The read runs through the caller-context Core API client (no system-context
// bypass). A record the caller cannot read comes back as `null`, so missing and
// unauthorized collapse to one typed status instead of leaking existence (C5).

export type RecordEnrichmentAssistStatus =
  | 'READ'
  | 'RECORD_NOT_FOUND'
  | 'INVALID_INPUT';

export type RecordEnrichmentTarget = 'PERSON' | 'COMPANY';

export type RecordEnrichmentField = {
  fieldName: string;
  value: string | null;
  isEmpty: boolean;
};

export type RecordEnrichmentAssistResult = {
  status: RecordEnrichmentAssistStatus;
  target: RecordEnrichmentTarget | null;
  recordId: string;
  displayName: string | null;
  fields: RecordEnrichmentField[];
  missingFieldNames: string[];
};

export type RecordEnrichmentAssistInput = {
  personId?: string;
  companyId?: string;
};

type PersonNode = {
  id: string;
  name?: { firstName?: string | null; lastName?: string | null } | null;
  emails?: { primaryEmail?: string | null } | null;
  phones?: { primaryPhoneNumber?: string | null } | null;
  jobTitle?: string | null;
  linkedinLink?: { primaryLinkUrl?: string | null } | null;
  companyId?: string | null;
};

type CompanyNode = {
  id: string;
  name?: string | null;
  domainName?: { primaryLinkUrl?: string | null } | null;
  linkedinLink?: { primaryLinkUrl?: string | null } | null;
  address?: {
    addressCity?: string | null;
    addressCountry?: string | null;
  } | null;
};

const PERSON_SELECTION = {
  id: true,
  name: { firstName: true, lastName: true },
  emails: { primaryEmail: true },
  phones: { primaryPhoneNumber: true },
  jobTitle: true,
  linkedinLink: { primaryLinkUrl: true },
  companyId: true,
} as const;

const COMPANY_SELECTION = {
  id: true,
  name: true,
  domainName: { primaryLinkUrl: true },
  linkedinLink: { primaryLinkUrl: true },
  address: { addressCity: true, addressCountry: true },
} as const;

const toField = (
  fieldName: string,
  value: string | null | undefined,
): RecordEnrichmentField => {
  const normalized = hasNonEmptyString(value) ? value.trim() : null;

  return { fieldName, value: normalized, isEmpty: normalized === null };
};

const personDisplayName = (node: PersonNode): string | null => {
  const parts = [node.name?.firstName, node.name?.lastName].filter(
    hasNonEmptyString,
  );

  return parts.length > 0 ? parts.join(' ') : null;
};

const toPersonResult = (node: PersonNode): RecordEnrichmentAssistResult => {
  const fields = [
    toField('name.firstName', node.name?.firstName),
    toField('name.lastName', node.name?.lastName),
    toField('emails.primaryEmail', node.emails?.primaryEmail),
    toField('phones.primaryPhoneNumber', node.phones?.primaryPhoneNumber),
    toField('jobTitle', node.jobTitle),
    toField('linkedinLink.primaryLinkUrl', node.linkedinLink?.primaryLinkUrl),
    toField('companyId', node.companyId),
  ];

  return {
    status: 'READ',
    target: 'PERSON',
    recordId: node.id,
    displayName: personDisplayName(node),
    fields,
    missingFieldNames: fields
      .filter((field) => field.isEmpty)
      .map((field) => field.fieldName),
  };
};

const toCompanyResult = (node: CompanyNode): RecordEnrichmentAssistResult => {
  const fields = [
    toField('name', node.name),
    toField('domainName.primaryLinkUrl', node.domainName?.primaryLinkUrl),
    toField('linkedinLink.primaryLinkUrl', node.linkedinLink?.primaryLinkUrl),
    toField('address.addressCity', node.address?.addressCity),
    toField('address.addressCountry', node.address?.addressCountry),
  ];

  return {
    status: 'READ',
    target: 'COMPANY',
    recordId: node.id,
    displayName: hasNonEmptyString(node.name) ? node.name.trim() : null,
    fields,
    missingFieldNames: fields
      .filter((field) => field.isEmpty)
      .map((field) => field.fieldName),
  };
};

const readPerson = async (
  client: CoreClientLike,
  personId: string,
): Promise<PersonNode | undefined> => {
  const result = (await client.query({
    person: { __args: { id: personId }, ...PERSON_SELECTION },
  } as never)) as { person?: PersonNode | null };

  return result?.person ?? undefined;
};

const readCompany = async (
  client: CoreClientLike,
  companyId: string,
): Promise<CompanyNode | undefined> => {
  const result = (await client.query({
    company: { __args: { id: companyId }, ...COMPANY_SELECTION },
  } as never)) as { company?: CompanyNode | null };

  return result?.company ?? undefined;
};

const notFound = (
  target: RecordEnrichmentTarget,
  recordId: string,
): RecordEnrichmentAssistResult => ({
  status: 'RECORD_NOT_FOUND',
  target,
  recordId,
  displayName: null,
  fields: [],
  missingFieldNames: [],
});

const invalid = (recordId: string): RecordEnrichmentAssistResult => ({
  status: 'INVALID_INPUT',
  target: null,
  recordId,
  displayName: null,
  fields: [],
  missingFieldNames: [],
});

export const assistRecordEnrichment = async (
  input: RecordEnrichmentAssistInput,
  client: CoreClientLike = coreClient(),
): Promise<RecordEnrichmentAssistResult> => {
  const personId = hasNonEmptyString(input.personId)
    ? input.personId.trim()
    : '';
  const companyId = hasNonEmptyString(input.companyId)
    ? input.companyId.trim()
    : '';

  // Exactly one record per call: a both-or-neither input is a caller mistake,
  // refused before any read rather than silently picking one.
  if ((personId === '') === (companyId === '')) {
    return invalid(personId !== '' ? personId : companyId);
  }

  if (personId !== '') {
    const person = await readPerson(client, personId);

    return person === undefined
      ? notFound('PERSON', personId)
      : toPersonResult(person);
  }

  const company = await readCompany(client, companyId);

  return company === undefined
    ? notFound('COMPANY', companyId)
    : toCompanyResult(company);
};
