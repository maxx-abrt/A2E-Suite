import { isDefined } from 'twenty-shared/utils';
import { type IconComponent } from 'twenty-ui/icon';

// In-memory only: the reverse index is derived from the icon registry and must
// never be persisted (a Map is not JSON data).
const reverseIconIndexCache = new WeakMap<
  Record<string, IconComponent>,
  Map<IconComponent, string>
>();

const getReverseIconIndex = (icons: Record<string, IconComponent>) => {
  const cachedIndex = reverseIconIndexCache.get(icons);

  if (isDefined(cachedIndex)) {
    return cachedIndex;
  }

  const reverseIndex = new Map<IconComponent, string>();

  for (const [iconKey, iconComponent] of Object.entries(icons)) {
    if (!reverseIndex.has(iconComponent)) {
      reverseIndex.set(iconComponent, iconKey);
    }
  }

  reverseIconIndexCache.set(icons, reverseIndex);

  return reverseIndex;
};

/**
 * Maps a live `IconComponent` back to its canonical Twenty icon key so the
 * value stored in localStorage stays a plain string.
 */
export const getIconKeyFromIconComponent = ({
  icons,
  iconComponent,
}: {
  icons: Record<string, IconComponent>;
  iconComponent?: IconComponent;
}): string | undefined => {
  if (!isDefined(iconComponent)) {
    return undefined;
  }

  return getReverseIconIndex(icons).get(iconComponent);
};
