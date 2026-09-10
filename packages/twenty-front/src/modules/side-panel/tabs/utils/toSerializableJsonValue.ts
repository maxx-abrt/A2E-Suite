import { isDefined } from 'twenty-shared/utils';

/**
 * Router location state is caller-provided and may hold class instances,
 * functions or cycles. Anything that does not survive a JSON round-trip is
 * dropped rather than corrupting the persisted session.
 */
export const toSerializableJsonValue = (value: unknown): unknown => {
  if (!isDefined(value)) {
    return undefined;
  }

  try {
    const serialized = JSON.stringify(value);

    if (!isDefined(serialized)) {
      return undefined;
    }

    return JSON.parse(serialized) as unknown;
  } catch {
    return undefined;
  }
};
