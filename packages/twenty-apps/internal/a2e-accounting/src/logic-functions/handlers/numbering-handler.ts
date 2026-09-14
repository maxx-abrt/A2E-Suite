import {
  buildDocumentNumber,
  readCounterState,
  shouldStampInvoiceNumber,
} from '../../lib/numbering.ts';
import { INVOICE_STATUS } from '../../constants/field-vocabulary.ts';
import {
  coreClient,
  findOneRecord,
  updateRecord,
  type RecordShape,
} from '../utils/records.ts';

// L'ALLOCATEUR DE NUMÉROS.
//
// Une facture française numérotée deux fois avec le même numéro (ou un trou
// dans la séquence) est une anomalie relevée en contrôle fiscal (art. L102 B
// du LPF). Le compteur vit sur orgProfile, écrit par des chemins concurrents
// (deux factures émises en même temps, un cron + un humain) : « lire puis
// écrire » allouerait deux fois le même numéro.
//
// La primitive de CAS du Core API : `updateManyOrgProfiles` rend le filtre
// d'appel en WHERE du UPDATE et ne retourne QUE les lignes réellement écrites.
// Faire porter la valeur attendue du compteur par ce filtre fait du filtre un
// compare-and-swap : un concurrent a déjà incrémenté ssi la réponse est vide.
// Aucune autre primitive (pas de upsert atomique, pas de table de séquences
// dédiée) ne garantit l'unicité sans ce détournement du filtre.

export type DocumentKind = 'invoice' | 'quote' | 'receipt';

type CounterField = {
  prefixField: string;
  nextNumberField: string;
};

const COUNTER_FIELDS: Record<DocumentKind, CounterField> = {
  invoice: {
    prefixField: 'invoiceNumberPrefix',
    nextNumberField: 'invoiceNextNumber',
  },
  quote: {
    prefixField: 'quoteNumberPrefix',
    nextNumberField: 'quoteNextNumber',
  },
  receipt: {
    prefixField: 'receiptNumberPrefix',
    nextNumberField: 'receiptNextNumber',
  },
};

const counterSelection = (): RecordShape => {
  const fields: RecordShape = {};

  for (const counter of Object.values(COUNTER_FIELDS)) {
    fields[counter.prefixField] = true;
    fields[counter.nextNumberField] = true;
  }

  return fields;
};

// The lease is single-shot: a crash between allocation and numbering burns the
// number, which is legal (a gap) where a reused number is not.
const MAX_ALLOCATION_ATTEMPTS = 10;

const readCounterFromProfile = (
  profile: Record<string, unknown>,
  kind: DocumentKind,
): { prefix: string | undefined; next: number } => {
  const counterField = COUNTER_FIELDS[kind];

  return readCounterState(
    profile,
    counterField.prefixField,
    counterField.nextNumberField,
  );
};

const casBumpCounter = async (
  client: CoreClientLike,
  profileId: string,
  nextNumberField: string,
  expected: number,
): Promise<boolean> => {
  const result = (await client.mutation({
    updateOrgProfiles: {
      __args: {
        // Pinning the expected counter makes the filtered UPDATE a CAS: the
        // `is: NULL` arm covers profiles seeded before the field existed, and
        // bumps the same row to 2 exactly once even on that first allocation.
        filter: {
          id: { eq: profileId },
          [nextNumberField]: {
            or: [{ eq: expected }, { is: 'NULL' as const }],
          },
        },
        data: { [nextNumberField]: expected + 1 },
      },
      id: true,
    },
  } as never)) as Record<string, unknown[]>;

  return (result?.updateOrgProfiles?.length ?? 0) > 0;
};

export type AllocatedNumber = {
  number: string;
  orgProfileId: string;
  sequence: number;
};

// The client is injectable so a test can exercise the CAS without a live
// Core API (the generated client throws before generation).
export type CoreClientLike = Pick<
  ReturnType<typeof coreClient>,
  'query' | 'mutation'
>;

// The full issuance flow, extracted from the logic function so the unit
// runner can exercise it without importing `twenty-sdk/define`.
export type InvoiceNumberFlowResult =
  | { skipped: string }
  | { stamped: string };

export const stampInvoiceNumberIssued = async (
  recordId: string,
  record: { number?: string | null; status?: string | null },
  eventName: string,
  client: CoreClientLike = coreClient(),
): Promise<InvoiceNumberFlowResult> => {
  const isCreated = eventName.endsWith('.created');

  // A DRAFT creation never burns a number; the update that issues it does.
  if (isCreated && record.status === INVOICE_STATUS.DRAFT) {
    return { skipped: 'draft-created' };
  }

  // On updates the invariant is re-checked instead of re-allocated, so a
  // record created before this function existed is stamped the first time it
  // is touched — and an already-numbered invoice never gets a second number.
  if (!isCreated && !shouldStampInvoiceNumber(record)) {
    return { skipped: 'already-numbered-or-draft' };
  }

  const allocated = await allocateDocumentNumber('invoice', new Date(), client);

  await updateRecord(
    client as ReturnType<typeof coreClient>,
    'updateInvoice',
    recordId,
    { number: allocated.number },
  );

  return { stamped: allocated.number };
};

export const allocateDocumentNumber = async (
  kind: DocumentKind,
  issuedAt: Date = new Date(),
  client: CoreClientLike = coreClient(),
): Promise<AllocatedNumber> => {
  // The helpers in utils/records are typed against the concrete generated
  // client; the injectable stub satisfies the same structural surface for the
  // two methods the allocator touches.
  const profile = (await findOneRecord<Record<string, unknown>>(
    client as ReturnType<typeof coreClient>,
    'orgProfiles',
    { id: true, ...counterSelection() },
    {},
  )) as Record<string, unknown> | undefined;

  if (profile === undefined) {
    throw new Error(
      "Aucun profil financier : installez Bilan ou créez le profil de structure avant d'émettre.",
    );
  }

  const nextNumberField = COUNTER_FIELDS[kind].nextNumberField;

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const { prefix, next } = readCounterFromProfile(profile, kind);
    const candidate = buildDocumentNumber({ prefix: prefix ?? '', next }, issuedAt);

    // A concurrent increment lost the CAS only because our snapshot is stale;
    // re-read and retry with the fresh counter instead of guessing it.
    const profileId = profile.id as string;

    if (await casBumpCounter(client, profileId, nextNumberField, next)) {
      return {
        number: candidate,
        orgProfileId: profileId,
        sequence: next,
      };
    }

    const refreshed = (await findOneRecord<Record<string, unknown>>(
      client as ReturnType<typeof coreClient>,
      'orgProfiles',
      { id: true, [nextNumberField]: true },
      { id: { eq: profileId } },
    )) as Record<string, unknown> | undefined;

    if (refreshed !== undefined) {
      profile[nextNumberField] = refreshed[nextNumberField];
    }
  }

  throw new Error(
    'Numérotation contestée : le compteur a changé à chaque tentative. ' +
      'Réessayez plus tard.',
  );
};
