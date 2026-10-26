import { BilanProfileSetup } from '@/bilan/components/BilanProfileSetup';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockRefetch = jest.fn();
jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));
jest.mock('@/object-record/hooks/useObjectPermissionsForObject');
const objectMetadataItem = {
  id: 'org-object',
  nameSingular: 'orgProfile',
  namePlural: 'orgProfiles',
  readableFields: [{ name: 'legalName' }],
} as EnrichedObjectMetadataItem;
const renderSetup = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <BilanProfileSetup objectMetadataItem={objectMetadataItem} />
      </MemoryRouter>
    </I18nProvider>,
  );
beforeEach(() => {
  jest.clearAllMocks();
  i18n.load('en', {});
  i18n.activate('en');
  jest.mocked(useObjectPermissionsForObject).mockReturnValue({
    canReadObjectRecords: true,
    canUpdateObjectRecords: true,
  } as ReturnType<typeof useObjectPermissionsForObject>);
  jest.mocked(useFindManyRecords).mockReturnValue({
    records: [{ id: 'profile', legalName: 'Ma structure' }],
    loading: false,
    refetch: mockRefetch,
  } as unknown as ReturnType<typeof useFindManyRecords>);
});
it('takes a seeded placeholder directly to its existing financial profile', () => {
  renderSetup();
  expect(screen.getByRole('link', { name: 'Set up profile' })).toHaveAttribute(
    'href',
    '/object/orgProfile/profile',
  );
  expect(useFindManyRecords).toHaveBeenCalledWith(
    expect.objectContaining({ recordGqlFields: { id: true, legalName: true } }),
  );
});
it('stays quiet once a real name is configured', () => {
  jest.mocked(useFindManyRecords).mockReturnValue({
    records: [{ id: 'profile', legalName: 'My association' }],
    loading: false,
  } as unknown as ReturnType<typeof useFindManyRecords>);
  renderSetup();
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
it('does not query profile records for a read-only role', () => {
  jest.mocked(useObjectPermissionsForObject).mockReturnValue({
    canReadObjectRecords: true,
    canUpdateObjectRecords: false,
  } as ReturnType<typeof useObjectPermissionsForObject>);
  renderSetup();
  expect(useFindManyRecords).not.toHaveBeenCalled();
});
it('offers retry after a real profile-loading failure', async () => {
  jest.mocked(useFindManyRecords).mockReturnValue({
    records: [],
    loading: false,
    error: new Error('Offline'),
    refetch: mockRefetch,
  } as unknown as ReturnType<typeof useFindManyRecords>);
  renderSetup();
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Retry financial profile' }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});
