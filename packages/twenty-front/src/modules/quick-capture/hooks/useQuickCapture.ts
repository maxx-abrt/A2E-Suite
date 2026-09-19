import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import {
  buildQuickCaptureCreatePlan,
  buildQuickCaptureNavigationPlan,
  DEFAULT_QUICK_CAPTURE_TARGET_ID,
  isQuickCaptureIncomeTarget,
  QUICK_CAPTURE_INCOME_COMMAND_SEARCH,
  type QuickCaptureTargetId,
} from '@/quick-capture/utils/quickCapture';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { sidePanelSearchState } from '@/side-panel/states/sidePanelSearchState';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { CoreObjectNameSingular, SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconDotsVertical } from 'twenty-ui/icon';
import { useNavigateApp } from '~/hooks/useNavigateApp';

export const useQuickCapture = () => {
  const [quickCaptureText, setQuickCaptureText] = useState('');
  const [quickCaptureTarget, setQuickCaptureTarget] =
    useState<QuickCaptureTargetId>(DEFAULT_QUICK_CAPTURE_TARGET_ID);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigateApp = useNavigateApp();
  const { closeSidePanelMenu, navigateSidePanelMenu } = useSidePanelMenu();
  const setSidePanelSearch = useSetAtomState(sidePanelSearchState);
  const { enqueueErrorSnackBar } = useSnackBar();

  const { createOneRecord: createNote } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.Note,
  });
  const { createOneRecord: createTask } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.Task,
  });

  const canSubmit =
    isQuickCaptureIncomeTarget(quickCaptureTarget) ||
    buildQuickCaptureCreatePlan(quickCaptureTarget, quickCaptureText) !== null;

  // The income leg does not create a record: it reopens the command menu with
  // the search preset so P7.2's pinned "Bilan : saisie rapide" command stays the
  // only income entry point.
  const openIncomeCommand = () => {
    setSidePanelSearch(QUICK_CAPTURE_INCOME_COMMAND_SEARCH);
    navigateSidePanelMenu({
      page: SidePanelPages.CommandMenuDisplay,
      pageTitle: t`Command Menu`,
      pageIcon: IconDotsVertical,
      resetNavigationStack: true,
    });
  };

  const submitQuickCapture = async () => {
    if (isQuickCaptureIncomeTarget(quickCaptureTarget)) {
      openIncomeCommand();

      return;
    }

    const createPlan = buildQuickCaptureCreatePlan(
      quickCaptureTarget,
      quickCaptureText,
    );

    if (!isDefined(createPlan)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createdRecord =
        createPlan.objectNameSingular === CoreObjectNameSingular.Note
          ? await createNote(createPlan.recordInput)
          : await createTask(createPlan.recordInput);

      const navigationPlan = buildQuickCaptureNavigationPlan(
        quickCaptureTarget,
        createdRecord.id,
      );

      if (!isDefined(navigationPlan)) {
        return;
      }

      closeSidePanelMenu();
      navigateApp(navigationPlan.to, navigationPlan.params);
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not capture. Please try again.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    canSubmit,
    isSubmitting,
    quickCaptureTarget,
    quickCaptureText,
    setQuickCaptureTarget,
    setQuickCaptureText,
    submitQuickCapture,
  };
};
