import { useA2eCustomizeActions } from '@/a2e-customize/hooks/useA2eCustomizeActions';
import { A2E_CUSTOMIZE_ACTION_DROPDOWN_ID } from '@/a2e-customize/constants/A2eCustomizeActionDropdownId';
import { renderHook } from '@testing-library/react';
import { AppPath, SettingsPath } from 'twenty-shared/types';
import { useNavigateApp } from '~/hooks/useNavigateApp';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

const mockEnterLayoutCustomizationMode = jest.fn();
const mockCloseDropdown = jest.fn();
const mockNavigateApp = jest.fn();
const mockNavigateSettings = jest.fn();

jest.mock(
  '@/layout-customization/hooks/useEnterLayoutCustomizationMode',
  () => ({
    useEnterLayoutCustomizationMode: () => ({
      enterLayoutCustomizationMode: mockEnterLayoutCustomizationMode,
    }),
  }),
);

jest.mock('@/ui/layout/dropdown/hooks/useCloseDropdown', () => ({
  useCloseDropdown: () => ({ closeDropdown: mockCloseDropdown }),
}));

jest.mock('~/hooks/useNavigateApp', () => ({
  useNavigateApp: jest.fn(),
}));

jest.mock('~/hooks/useNavigateSettings', () => ({
  useNavigateSettings: jest.fn(),
}));

const mockedUseNavigateApp = jest.mocked(useNavigateApp);
const mockedUseNavigateSettings = jest.mocked(useNavigateSettings);

describe('useA2eCustomizeActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigateApp.mockReturnValue(mockNavigateApp);
    mockedUseNavigateSettings.mockReturnValue(mockNavigateSettings);
  });

  it('opens the native layout edit mode from the customize action', () => {
    const { result } = renderHook(() => useA2eCustomizeActions('documents'));

    result.current.editLayout();

    expect(mockCloseDropdown).toHaveBeenCalledWith(
      A2E_CUSTOMIZE_ACTION_DROPDOWN_ID,
    );
    expect(mockEnterLayoutCustomizationMode).toHaveBeenCalledTimes(1);
  });

  it('opens the surface views for a known object', () => {
    const { result } = renderHook(() => useA2eCustomizeActions('documents'));

    result.current.openViews();

    expect(mockNavigateApp).toHaveBeenCalledWith(AppPath.RecordIndexPage, {
      objectNamePlural: 'documents',
    });
  });

  it('opens the surface fields settings for a known object', () => {
    const { result } = renderHook(() => useA2eCustomizeActions('documents'));

    result.current.openFields();

    expect(mockNavigateSettings).toHaveBeenCalledWith(
      SettingsPath.ObjectDetail,
      { objectNamePlural: 'documents' },
    );
  });

  it('does not navigate to views or fields without a record object', () => {
    const { result } = renderHook(() => useA2eCustomizeActions());

    result.current.openViews();
    result.current.openFields();

    expect(mockNavigateApp).not.toHaveBeenCalled();
    expect(mockNavigateSettings).not.toHaveBeenCalled();
  });
});
