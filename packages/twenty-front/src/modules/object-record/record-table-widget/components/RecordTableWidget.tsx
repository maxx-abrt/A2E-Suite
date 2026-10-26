import { RecordIndexTableContainerEffect } from '@/object-record/record-index/components/RecordIndexTableContainerEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { RecordTableWidgetStatesEffect } from '@/object-record/record-table-widget/components/RecordTableWidgetStatesEffect';
import { RecordTableWidgetCommandMenu } from '@/object-record/record-table-widget/components/RecordTableWidgetCommandMenu';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { RecordTableWithWrappers } from '@/object-record/record-table/components/RecordTableWithWrappers';
import { styled } from '@linaria/react';
import { useContext } from 'react';

const StyledTableContainer = styled.div`
  min-height: 0;
  overflow: hidden;
`;

type RecordTableWidgetProps = {
  isUIEditable?: boolean;
  isEmptyStateHidden?: boolean;
  isCreationEnabled?: boolean;
};

export const RecordTableWidget = ({
  isUIEditable = false,
  isEmptyStateHidden = false,
  isCreationEnabled = true,
}: RecordTableWidgetProps) => {
  const { objectNameSingular, recordIndexId, viewBarInstanceId } =
    useRecordIndexContextOrThrow();
  const recordTableWidgetContext = useContext(RecordTableWidgetContext);

  return (
    <RecordTableWidgetCommandMenu>
      <RecordTableWidgetStatesEffect
        isCreationEnabled={isCreationEnabled}
        recordTableId={recordIndexId}
        isUIEditable={isUIEditable}
        isPageLayoutInEditMode={
          recordTableWidgetContext?.isPageLayoutInEditMode
        }
        isEmptyStateHidden={isEmptyStateHidden}
      />
      <RecordIndexTableContainerEffect />
      <StyledTableContainer>
        <RecordTableWithWrappers
          recordTableId={recordIndexId}
          objectNameSingular={objectNameSingular}
          viewBarId={viewBarInstanceId}
        />
      </StyledTableContainer>
    </RecordTableWidgetCommandMenu>
  );
};
