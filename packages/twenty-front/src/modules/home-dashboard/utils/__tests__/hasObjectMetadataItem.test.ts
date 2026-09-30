import { hasObjectMetadataItem } from '@/home-dashboard/utils/hasObjectMetadataItem';

describe('hasObjectMetadataItem', () => {
  it('is true when the object name is installed', () => {
    expect(
      hasObjectMetadataItem(
        [{ nameSingular: 'task' }, { nameSingular: 'invoice' }],
        'invoice',
      ),
    ).toBe(true);
  });

  it('is false when the app is absent', () => {
    expect(hasObjectMetadataItem([{ nameSingular: 'task' }], 'invoice')).toBe(
      false,
    );
  });

  it('is false for an empty metadata list', () => {
    expect(hasObjectMetadataItem([], 'document')).toBe(false);
  });
});
