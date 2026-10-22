import {
  BureauWorkspaceContext,
  type BureauWorkspaceContextValue,
} from '@/bureau/contexts/BureauWorkspaceContext';
import { RecentPagesWidget } from '@/home-dashboard/components/RecentPagesWidget';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => ({ objectMetadataItems: [] }),
}));
jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({ openRecordInSidePanel: jest.fn() }),
}));

describe('Bureau recent pages', () => {
  it('immediately reflects restored documents from the workspace data and opens the selected full page', async () => {
    i18n.load('en', {});
    i18n.activate('en');
    const onSelectPage = jest.fn();
    const value = { documents: [] } as unknown as BureauWorkspaceContextValue;
    const renderWidget = (contextValue: BureauWorkspaceContextValue) => (
      <I18nProvider i18n={i18n}>
        <BureauWorkspaceContext.Provider value={contextValue}>
          <RecentPagesWidget onSelectPage={onSelectPage} />
        </BureauWorkspaceContext.Provider>
      </I18nProvider>
    );
    const { rerender } = render(renderWidget(value));
    expect(screen.getByText('No recent pages')).toBeInTheDocument();
    const restoredValue = {
      documents: [
        {
          id: 'restored-page',
          title: 'Restored notes',
          kind: 'DOCUMENT',
          updatedAt: '2026-10-22T10:00:00Z',
        },
      ],
    } as unknown as BureauWorkspaceContextValue;
    rerender(renderWidget(restoredValue));
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: /^Restored notes/ }));
    expect(onSelectPage).toHaveBeenCalledWith('restored-page');
    expect(screen.queryByText('No recent pages')).not.toBeInTheDocument();
  });
});
