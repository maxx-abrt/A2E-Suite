import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledSetup = styled.section`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[4]};
`;
const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;
const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  margin: ${themeCssVariables.spacing[1]} 0 0;
`;

type BilanProfileSetupProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
};

export const BilanProfileSetup = ({
  objectMetadataItem,
}: BilanProfileSetupProps) => {
  const permissions = useObjectPermissionsForObject(objectMetadataItem.id);
  const hasLegalName = objectMetadataItem.readableFields.some(
    (field) => field.name === 'legalName',
  );
  return permissions.canReadObjectRecords &&
    permissions.canUpdateObjectRecords &&
    hasLegalName ? (
    <BilanProfileSetupContent objectMetadataItem={objectMetadataItem} />
  ) : null;
};

type BilanProfileSetupContentProps = BilanProfileSetupProps;

const BilanProfileSetupContent = ({
  objectMetadataItem,
}: BilanProfileSetupContentProps) => {
  const { t } = useLingui();
  const { records, loading, error, refetch } = useFindManyRecords<
    ObjectRecord & { legalName?: string | null }
  >({
    objectNameSingular: objectMetadataItem.nameSingular,
    limit: 1,
    recordGqlFields: { id: true, legalName: true },
  });
  if (loading) return null;
  if (error)
    return (
      <StyledSetup role="status">
        <StyledDescription>{t`Your financial profile could not load.`}</StyledDescription>
        <Button
          title={t`Retry financial profile`}
          ariaLabel={t`Retry financial profile`}
          size="small"
          variant="secondary"
          onClick={() => {
            void refetch();
          }}
        />
      </StyledSetup>
    );
  const profile = records[0];
  if (
    isNonEmptyString(profile?.legalName) &&
    profile.legalName.trim() !== 'Ma structure'
  )
    return null;
  return (
    <StyledSetup aria-label={t`Bilan setup`}>
      <div>
        <StyledTitle>{t`Complete your financial profile`}</StyledTitle>
        <StyledDescription>{t`Confirm your organization type, legal name and financial settings before preparing client documents.`}</StyledDescription>
      </div>
      <Button
        title={t`Set up profile`}
        ariaLabel={t`Set up profile`}
        variant="secondary"
        to={
          isDefined(profile)
            ? getAppPath(AppPath.RecordShowPage, {
                objectNameSingular: objectMetadataItem.nameSingular,
                objectRecordId: profile.id,
              })
            : getAppPath(AppPath.RecordIndexPage, {
                objectNamePlural: objectMetadataItem.namePlural,
              })
        }
      />
    </StyledSetup>
  );
};
