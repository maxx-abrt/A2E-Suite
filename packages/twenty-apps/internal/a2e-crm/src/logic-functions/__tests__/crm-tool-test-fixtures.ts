import type { CoreClientLike } from '../handlers/crm-tool-support.ts';

// A minimal fake caller-context Core API client. `query` is the only method the
// read-only CRM tools may use, so the type itself pins "no write path". The
// fixture records every call so a spec can assert which native object was read,
// with which id, and that no extra read happened.

export type CapturedQuery = {
  field: string;
  args: unknown;
  selection: Record<string, unknown>;
};

export const buildFakeCoreClient = (payloads: Record<string, unknown>) => {
  const calls: CapturedQuery[] = [];

  const client = {
    query: async (document: unknown) => {
      const root = document as Record<
        string,
        { __args?: Record<string, unknown> }
      >;
      const field = Object.keys(root)[0] ?? '';
      const selection = (root[field] ?? {}) as Record<string, unknown>;

      calls.push({ field, args: selection.__args, selection });

      // Reproduce the Core query frontier: each root key yields the configured
      // value — including an explicit `null`, which is how the Core API answers
      // a missing or unauthorized record.
      return { [field]: payloads[field] };
    },
  };

  return { client: client as unknown as CoreClientLike, calls };
};

export const findQuery = (
  calls: CapturedQuery[],
  field: string,
): CapturedQuery | undefined => calls.find((call) => call.field === field);
