import { PageLayoutEditModeProvider } from '@/page-layout/components/PageLayoutEditModeProvider';
import { PageLayoutInitializationQueryEffect } from '@/page-layout/components/PageLayoutInitializationQueryEffect';
import { PageLayoutRecordPageCustomizationSessionRegistrationEffect } from '@/page-layout/components/PageLayoutRecordPageCustomizationSessionRegistrationEffect';
import { PageLayoutRendererContent } from '@/page-layout/components/PageLayoutRendererContent';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { RecordTableWidgetViewDraftsInitializationEffect } from '@/page-layout/widgets/record-table/components/RecordTableWidgetViewDraftsInitializationEffect';
import { getTabListInstanceIdFromPageLayoutAndRecord } from '@/page-layout/utils/getTabListInstanceIdFromPageLayoutAndRecord';
import { useLayoutRenderingContext } from '@/ui/layout/contexts/LayoutRenderingContext';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { TabListComponentInstanceContext } from '@/ui/layout/tab-list/states/contexts/TabListComponentInstanceContext';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { type ReactNode } from 'react';

type PageLayoutRendererProps = {
  pageLayoutId: string;
  headerContent?: ReactNode;
};

export const PageLayoutRenderer = ({
  pageLayoutId,
  headerContent,
}: PageLayoutRendererProps) => {
  const { targetRecordIdentifier, layoutType } = useLayoutRenderingContext();

  const pageLayoutComponentInstanceId =
    useWorkspaceSurfaceScopedComponentInstanceId(pageLayoutId);

  const tabListInstanceId = useWorkspaceSurfaceScopedComponentInstanceId(
    getTabListInstanceIdFromPageLayoutAndRecord({
      pageLayoutId,
      layoutType,
      targetRecordIdentifier,
    }),
  );

  return (
    <PageLayoutComponentInstanceContext.Provider
      value={{
        instanceId: pageLayoutComponentInstanceId,
      }}
    >
      <TabListComponentInstanceContext.Provider
        value={{
          instanceId: tabListInstanceId,
        }}
      >
        <PageLayoutEditModeProvider
          layoutType={layoutType}
          pageLayoutId={pageLayoutId}
        >
          <PageLayoutInitializationQueryEffect pageLayoutId={pageLayoutId} />
          <PageLayoutRecordPageCustomizationSessionRegistrationEffect />
          <RecordTableWidgetViewDraftsInitializationEffect />
          <PageLayoutRendererContent headerContent={headerContent} />
        </PageLayoutEditModeProvider>
      </TabListComponentInstanceContext.Provider>
    </PageLayoutComponentInstanceContext.Provider>
  );
};
