import { BUREAU_FAVORITE_OBJECT_NAME_SINGULAR } from '@/bureau/constants/BureauFavoriteObjectNameSingular';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';

export const useIsBureauAvailable = () => {
  const isInstalled = useIsDocumentApplicationInstalled();
  const { objectMetadataItems } = useObjectMetadataItems();

  return (
    isInstalled &&
    ['document', BUREAU_FAVORITE_OBJECT_NAME_SINGULAR].every((nameSingular) =>
      objectMetadataItems.some(
        (objectMetadataItem) =>
          objectMetadataItem.nameSingular === nameSingular,
      ),
    )
  );
};
