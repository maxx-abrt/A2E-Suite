import { RecordChip } from '@/object-record/components/RecordChip';
import { useChipFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useChipFieldDisplay';
import { isDefined } from 'twenty-shared/utils';
import { ChipSize, ChipVariant } from 'twenty-ui/data-display';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useContext } from 'react';

export const ChipFieldDisplay = () => {
  const { isLabelIdentifier } = useContext(FieldContext);
  const {
    recordStore: recordValue,
    objectNameSingular,
    labelIdentifierLink,
    disableChipClick,
    maxWidth,
    triggerEvent,
    onRecordChipClick,
  } = useChipFieldDisplay();
  const isWorkRecordTitle =
    isLabelIdentifier && ['task', 'project'].includes(objectNameSingular);

  if (!isDefined(recordValue)) {
    return null;
  }

  return (
    <RecordChip
      maxWidth={maxWidth}
      objectNameSingular={objectNameSingular}
      record={recordValue}
      size={ChipSize.Small}
      isIconHidden={isWorkRecordTitle}
      variant={isWorkRecordTitle ? ChipVariant.Transparent : undefined}
      to={labelIdentifierLink}
      forceDisableClick={disableChipClick}
      triggerEvent={triggerEvent}
      onClick={onRecordChipClick}
    />
  );
};
