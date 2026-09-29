import { defineNavigationMenuItem } from '@/sdk/define';
import { NavigationMenuItemType } from 'twenty-shared/types';

const baseConfig = {
  universalIdentifier: 'c31c0000-0010-4000-8000-000000000001',
  name: 'Archive',
  position: 140,
};

describe('defineNavigationMenuItem', () => {
  it('should accept a VIEW item without a link', () => {
    const result = defineNavigationMenuItem({
      ...baseConfig,
      type: NavigationMenuItemType.VIEW,
      viewUniversalIdentifier: 'c31c0100-0003-4000-8000-000000000001',
    });

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it.each(['https://twenty.com', '/drive', '/discussions', '/chat/thread-1'])(
    'should accept the LINK target %s',
    (link) => {
      const result = defineNavigationMenuItem({
        ...baseConfig,
        type: NavigationMenuItemType.LINK,
        link,
      });

      expect(result.success).toBe(true);
    },
  );

  it.each(['/settings', '//evil.com', 'javascript:alert(1)'])(
    'should reject the LINK target %s',
    (link) => {
      const result = defineNavigationMenuItem({
        ...baseConfig,
        type: NavigationMenuItemType.LINK,
        link,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    },
  );

  it('should require a position', () => {
    const result = defineNavigationMenuItem({
      universalIdentifier: baseConfig.universalIdentifier,
      type: NavigationMenuItemType.VIEW,
      position: undefined as unknown as number,
    });

    expect(result.success).toBe(false);
  });
});
