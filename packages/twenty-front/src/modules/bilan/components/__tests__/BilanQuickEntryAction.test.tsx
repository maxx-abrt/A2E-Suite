import { BilanQuickEntryAction } from '@/bilan/components/BilanQuickEntryAction';
import { BILAN_METADATA_UNIVERSAL_IDENTIFIERS } from '@/bilan/constants/BilanMetadata';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockOpen = jest.fn();
jest.mock('@/object-record/hooks/useObjectPermissionsForObject');
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
jest.mock('@/side-panel/hooks/useOpenFrontComponentInSidePanel', () => ({
  useOpenFrontComponentInSidePanel: () => ({
    openFrontComponentInSidePanel: mockOpen,
  }),
}));
const objectMetadataItem = {
  id: 'finance-object',
  isUICreatable: true,
  isUIEditable: true,
  writability: 'OPEN',
  updatableFields: ['label', 'amount', 'entryDate', 'entryType'].map(
    (name) => ({ name }),
  ),
} as EnrichedObjectMetadataItem;
const renderAction = (object = objectMetadataItem) =>
  render(
    <I18nProvider i18n={i18n}>
      <BilanQuickEntryAction objectMetadataItem={object} />
    </I18nProvider>,
  );
beforeEach(() => {
  jest.clearAllMocks();
  i18n.load('en', {});
  i18n.activate('en');
  jest.mocked(useAtomStateValue).mockReturnValue([
    {
      id: 'installed-entry-component',
      universalIdentifier: BILAN_METADATA_UNIVERSAL_IDENTIFIERS.quickEntry,
    },
  ]);
  jest
    .mocked(useObjectPermissionsForObject)
    .mockReturnValue({ canUpdateObjectRecords: true } as ReturnType<
      typeof useObjectPermissionsForObject
    >);
});
it('opens the existing installed quick-entry form without creating an empty transaction', async () => {
  renderAction();
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Add transaction' }));
  expect(mockOpen).toHaveBeenCalledWith(
    expect.objectContaining({
      frontComponentId: 'installed-entry-component',
      pageTitle: 'Add transaction',
    }),
  );
});
it('hides entry when the native component is absent', () => {
  jest.mocked(useAtomStateValue).mockReturnValue([]);
  renderAction();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('hides entry under record and field write restrictions', () => {
  renderAction({ ...objectMetadataItem, updatableFields: [] });
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
