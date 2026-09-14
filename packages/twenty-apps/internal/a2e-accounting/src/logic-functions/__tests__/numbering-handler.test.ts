import assert from 'node:assert/strict';
import { test } from 'node:test';

import { allocateDocumentNumber } from '../handlers/numbering-handler.ts';

// The CAS contract with the Core API: `updateManyOrgProfiles` renders the
// caller filter into the UPDATE WHERE and returns only the rows it wrote.
// The stub enforces exactly that boundary — no live server, and the generated
// client is never instantiated (it throws before generation).

type MutationCall = {
  filter: Record<string, unknown>;
  data: Record<string, unknown>;
};

const buildClientStub = (options: {
  storedCounter: number | null;
  nextNumberField?: string;
  calls: MutationCall[];
}) => {
  const nextNumberField = options.nextNumberField ?? 'invoiceNextNumber';
  let stored = options.storedCounter;

  return {
    query: async () => ({
      orgProfiles: {
        edges: [
          {
            node: {
              id: 'profile-1',
              invoiceNumberPrefix: 'FA-{{YYYY}}-',
              invoiceNextNumber: stored,
            },
          },
        ],
      },
    }),
    mutation: async (selection: Record<string, unknown>) => {
      const args = (
        selection as Record<
          string,
          { __args: { filter: Record<string, unknown>; data: Record<string, unknown> } }
        >
      ).updateOrgProfiles.__args;

      options.calls.push(args);

      const expected = (
        (args.filter[nextNumberField] as Record<string, unknown>).or as Record<
          string,
          unknown
        >[]
      )[0].eq as number;

      const matches =
        stored === null ? true : stored === expected;

      if (!matches) {
        return { updateOrgProfiles: [] };
      }

      stored = expected + 1;

      return { updateOrgProfiles: [{ id: 'profile-1' }] };
    },
  };
};

test('a losing allocator retries with the refreshed counter and never reprints a number', async () => {
  const calls: {
    filter: Record<string, unknown>;
    data: Record<string, unknown>;
  }[] = [];

  let attempts = 0;

  const client = {
    query: async () => {
      attempts += 1;

      // The rival bumps 4→5 after our first read: the second read must see 5.
      return {
        orgProfiles: {
          edges: [
            {
              node: {
                id: 'profile-1',
                invoiceNumberPrefix: 'FA-{{YYYY}}-',
                invoiceNextNumber: attempts === 1 ? 4 : 5,
              },
            },
          ],
        },
      };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const args = (
        selection as Record<
          string,
          { __args: { filter: Record<string, unknown>; data: Record<string, unknown> } }
        >
      ).updateOrgProfiles.__args;

      calls.push(args);

      const expected = (
        ((args.filter.invoiceNextNumber as Record<string, unknown>).or as Record<
          string,
          unknown
        >[])[0].eq
      ) as number;

      // The stored value tracks the last successful bump; the rival took 4.
      const stored = expected === 4 ? 5 : expected;

      if (stored !== expected) {
        return { updateOrgProfiles: [] };
      }

      return { updateOrgProfiles: [{ id: 'profile-1' }] };
    },
  };

  const allocated = await allocateDocumentNumber('invoice', new Date(), client);

  assert.deepEqual(calls[0].data, { invoiceNextNumber: 5 });
  assert.deepEqual(calls[1].data, { invoiceNextNumber: 6 });
  assert.equal(allocated.sequence, 5);
  assert.equal(allocated.number, 'FA-2026-0005');
});

test('the winner allocates exactly once and the CAS pins the expected counter', async () => {
  const calls: {
    filter: Record<string, unknown>;
    data: Record<string, unknown>;
  }[] = [];

  const client = buildClientStub({
    storedCounter: 12,
    calls,
  });

  const allocated = await allocateDocumentNumber('invoice', new Date(), client);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].data, { invoiceNextNumber: 13 });
  assert.equal(allocated.sequence, 12);
  assert.equal(allocated.number, 'FA-2026-0012');
});

test('a NULL counter is bumped to 2 by the first allocation, not reused', async () => {
  const calls: {
    filter: Record<string, unknown>;
    data: Record<string, unknown>;
  }[] = [];

  const client = buildClientStub({
    storedCounter: null,
    nextNumberField: 'quoteNextNumber',
    calls,
  });

  const allocated = await allocateDocumentNumber('quote', new Date(), client);

  assert.equal(allocated.sequence, 1);
  // Quote prefix falls back to '' in the stub profile; the sequence is what
  // the CAS guaranteed.
  assert.deepEqual(calls[0].data, { quoteNextNumber: 2 });
});

test('giving up after the attempt cap throws instead of guessing', async () => {
  const client = {
    query: async () => ({
      orgProfiles: {
        edges: [
          {
            node: {
              id: 'profile-1',
              invoiceNumberPrefix: 'FA-{{YYYY}}-',
              // Always one ahead of every CAS attempt: contention never ends.
              invoiceNextNumber: 99,
            },
          },
        ],
      },
    }),
    mutation: async () => ({ updateOrgProfiles: [] }),
  };

  await assert.rejects(
    allocateDocumentNumber('invoice', new Date(), client),
    /Numérotation contestée/,
  );
});
