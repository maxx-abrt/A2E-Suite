import { MentionRecordChip } from '@/mention/components/MentionRecordChip';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { RecordChip } from '@/object-record/components/RecordChip';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { createReactInlineContentSpec } from '@blocknote/react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { Chip, ChipVariant } from 'twenty-ui/data-display';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledRecordChipContainer = styled.div`
  display: inline;
  height: auto;
  margin: 0;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledInlineMentionRecordChipContainer = styled.div`
  display: inline;
  height: auto;
  margin: 0;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const LegacyMentionRenderer = ({
  recordId,
  objectMetadataId,
}: {
  recordId: string;
  objectMetadataId: string;
}) => {
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

  const objectMetadataItem = objectMetadataItems.find(
    (item) => item.id === objectMetadataId,
  );

  const objectNameSingular = objectMetadataItem?.nameSingular;

  const { record, loading } = useFindOneRecord({
    objectNameSingular: objectNameSingular ?? '',
    objectRecordId: recordId,
    skip: !isNonEmptyString(objectNameSingular) || !isNonEmptyString(recordId),
  });

  if (loading) {
    return null;
  }

  if (!isDefined(objectMetadataItem)) {
    return (
      <Chip
        label={t`Unknown object`}
        variant={ChipVariant.Transparent}
        disabled
      />
    );
  }

  if (!isDefined(record)) {
    return (
      <Chip
        label={t`Deleted record`}
        variant={ChipVariant.Transparent}
        disabled
      />
    );
  }

  return (
    <StyledRecordChipContainer>
      <RecordChip
        objectNameSingular={objectMetadataItem.nameSingular}
        record={record}
        forceDisableClick={false}
      />
    </StyledRecordChipContainer>
  );
};

export const MentionInlineContent = createReactInlineContentSpec(
  {
    type: 'mention' as const,
    propSchema: {
      recordId: {
        default: '' as const,
      },
      objectMetadataId: {
        default: '' as const,
      },
      objectNameSingular: {
        default: '' as const,
      },
      label: {
        default: '' as const,
      },
      imageUrl: {
        default: '' as const,
      },
    },
    content: 'none',
  },
  {
    // Imported rich text carries record chips as data-attribute spans; without
    // a parse function the parser drops them silently on import. The tag rule
    // is global (`tag: '*'`), so it must decline every other element.
    parse: (element) => {
      if (element.getAttribute('data-content-type') === 'mention') {
        return {
          recordId: element.getAttribute('data-record-id') ?? '',
          objectMetadataId:
            element.getAttribute('data-object-metadata-id') ?? '',
          objectNameSingular:
            element.getAttribute('data-object-name-singular') ?? '',
          label: element.getAttribute('data-label') ?? '',
          imageUrl: element.getAttribute('data-image-url') ?? '',
        };
      }
      const recordId = element.getAttribute('data-record-id') ?? '';
      const objectNameSingular =
        element.getAttribute('data-object-name-singular') ?? '';
      if (recordId === '' || objectNameSingular === '') return undefined;
      return {
        recordId,
        objectMetadataId: element.getAttribute('data-object-metadata-id') ?? '',
        objectNameSingular,
        label: element.getAttribute('data-label') ?? '',
        imageUrl: element.getAttribute('data-image-url') ?? '',
      };
    },
    toExternalHTML: ({ inlineContent: { props } }) => {
      const attributes: Record<string, string> = {
        'data-content-type': 'mention',
        'data-record-id': props.recordId ?? '',
      };
      if (isNonEmptyString(props.objectNameSingular ?? ''))
        attributes['data-object-name-singular'] =
          props.objectNameSingular ?? '';
      if (isNonEmptyString(props.label ?? ''))
        attributes['data-label'] = props.label ?? '';
      if (isNonEmptyString(props.imageUrl ?? ''))
        attributes['data-image-url'] = props.imageUrl ?? '';
      // oxlint-disable-next-line eslint-plugin-react/jsx-props-no-spreading -- keys come from a dynamic prop bag
      return <span {...attributes} />;
    },
    render: (props) => {
      const {
        recordId,
        objectMetadataId,
        objectNameSingular,
        label,
        imageUrl,
      } = props.inlineContent.props;

      // New notes store objectNameSingular + label + imageUrl directly
      if (isNonEmptyString(objectNameSingular) && isNonEmptyString(label)) {
        return (
          <StyledInlineMentionRecordChipContainer>
            <MentionRecordChip
              recordId={recordId}
              objectNameSingular={objectNameSingular}
              label={label}
              imageUrl={imageUrl}
            />
          </StyledInlineMentionRecordChipContainer>
        );
      }

      // Legacy notes only have objectMetadataId + recordId: fetch data
      return (
        <LegacyMentionRenderer
          recordId={recordId}
          objectMetadataId={objectMetadataId}
        />
      );
    },
  },
);
