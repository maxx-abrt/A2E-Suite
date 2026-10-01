import { ErrorBoundary } from 'react-error-boundary';
import { isNonEmptyString } from '@sniptt/guards';

import { RecordViewEmbedStub } from '@/blocknote-editor/components/RecordViewEmbedStub';
import { RecordViewEmbedFrameView } from '@/blocknote-editor/blocks/views/RecordViewEmbedFrameView';
import {
  type RecordViewEmbedSelection,
  RecordViewEmbedViewPicker,
} from '@/blocknote-editor/components/RecordViewEmbedViewPicker';
import { resolveRecordViewEmbedState } from '@/blocknote-editor/utils/resolveRecordViewEmbedState';
import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { PageLayoutEditModeProviderContext } from '@/page-layout/contexts/PageLayoutEditModeContext';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { RecordTableWidgetRendererContent } from '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent';
import { useViewById } from '@/views/hooks/useViewById';

const RecordViewEmbedErrorFallback = () => (
  <RecordViewEmbedStub variant="unavailable" />
);

type RecordViewEmbedHostProps = {
  blockId: string;
  viewId: string;
  viewName: string;
  objectMetadataId: string;
  onSelectView: (selection: RecordViewEmbedSelection) => void;
};

// Hosts a live native view inside a page. Reuses the record-table widget stack
// (the same tree the dashboard widgets use) and degrades to a safe stub on
// missing metadata or denied permission — it never renders a raw error. The
// view is read-only unless the object grants update rights, so the widget's own
// cell-edit path persists through the standard record update mutation with no
// forked write path.
export const RecordViewEmbedHost = ({
  blockId,
  viewId,
  viewName,
  objectMetadataId,
  onSelectView,
}: RecordViewEmbedHostProps) => {
  const { objectMetadataItems } = useFilteredObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const { view } = useViewById(viewId);

  const resolvedObjectMetadataId = isNonEmptyString(objectMetadataId)
    ? objectMetadataId
    : (view?.objectMetadataId ?? '');

  const state = resolveRecordViewEmbedState({
    viewId,
    objectMetadataId: resolvedObjectMetadataId,
    objectMetadataItems,
    objectPermissionsByObjectMetadataId,
  });

  if (state.status === 'unconfigured') {
    return (
      <RecordViewEmbedViewPicker
        blockId={blockId}
        onSelectView={onSelectView}
      />
    );
  }

  if (state.status === 'denied') {
    return (
      <RecordViewEmbedStub variant="denied" objectLabel={state.objectLabel} />
    );
  }

  if (state.status === 'unavailable') {
    return <RecordViewEmbedStub variant="unavailable" />;
  }

  const displayName = isNonEmptyString(viewName) ? viewName : view?.name;

  return (
    <RecordViewEmbedFrameView title={displayName}>
      <PageLayoutEditModeProviderContext value={{ isInEditMode: false }}>
        <PageLayoutComponentInstanceContext.Provider
          value={{ instanceId: `record-view-embed-${blockId}` }}
        >
          <ErrorBoundary
            FallbackComponent={RecordViewEmbedErrorFallback}
            resetKeys={[viewId, state.objectMetadataId]}
          >
            <RecordTableWidgetRendererContent
              objectMetadataId={state.objectMetadataId}
              viewId={viewId}
              widgetId={blockId}
              isUIEditable={state.isUIEditable}
            />
          </ErrorBoundary>
        </PageLayoutComponentInstanceContext.Provider>
      </PageLayoutEditModeProviderContext>
    </RecordViewEmbedFrameView>
  );
};
