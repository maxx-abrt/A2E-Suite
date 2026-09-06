import { type SearchRecordObjectFrecencyByObject } from '@/side-panel/pages/search/states/searchRecordsFrecencyByObjectState';
import { pruneSearchRecordObjectFrecency } from '@/side-panel/pages/search/utils/pruneSearchRecordObjectFrecency';

const buildFrecencyByObject = (
  entries: Array<[string, number]>,
): SearchRecordObjectFrecencyByObject =>
  Object.fromEntries(
    entries.map(([objectKey, lastUsedAtTimestamp]) => [
      objectKey,
      { lastUsedAtTimestamp, useCount: 1 },
    ]),
  );

describe('pruneSearchRecordObjectFrecency', () => {
  it('keeps the map untouched under the cap', () => {
    const frecencyByObject = buildFrecencyByObject([
      ['company', 1],
      ['person', 2],
    ]);

    expect(
      pruneSearchRecordObjectFrecency({
        frecencyByObject,
        maxEntries: 3,
      }),
    ).toBe(frecencyByObject);
  });

  it('drops least recently used entries beyond the cap', () => {
    const pruned = pruneSearchRecordObjectFrecency({
      frecencyByObject: buildFrecencyByObject([
        ['company', 1],
        ['person', 3],
        ['task', 2],
      ]),
      maxEntries: 2,
    });

    expect(Object.keys(pruned).sort()).toEqual(['person', 'task']);
  });
});
