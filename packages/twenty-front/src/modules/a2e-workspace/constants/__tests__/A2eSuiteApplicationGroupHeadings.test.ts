import { A2E_SUITE_APPLICATION_GROUP_HEADINGS } from '@/a2e-workspace/constants/A2eSuiteApplicationGroupHeadings';
import { A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS } from '@/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers';

// Cmd+K groups app-provider results under the installed application display
// name. a2e-projects ships as "Bureau Projets", so its provider must resolve a
// suite heading instead; the mapping is keyed by universal identifier so the
// app's package and path constants stay untouched.

describe('A2E_SUITE_APPLICATION_GROUP_HEADINGS', () => {
  it('groups the a2e-projects provider under the Bureau suite heading', () => {
    expect(
      A2E_SUITE_APPLICATION_GROUP_HEADINGS[
        '4f759655-84f8-434d-9c76-ee1850e8c1a4'
      ],
    ).toBe('Bureau');
  });

  it('only overrides headings for allow-listed suite apps', () => {
    for (const universalIdentifier of Object.keys(
      A2E_SUITE_APPLICATION_GROUP_HEADINGS,
    )) {
      expect(A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS).toContain(
        universalIdentifier,
      );
    }
  });
});
