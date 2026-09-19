import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { TextInput } from '@/ui/input/components/TextInput';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import {
  IconCheckbox,
  IconCurrencyEuro,
  IconNotes,
  IconPlus,
  IconTrash,
  type IconComponent,
} from 'twenty-ui/icon';
import { Button, IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { getOsControlSymbol } from 'twenty-ui/utilities';

import { useQuickCapture } from '@/quick-capture/hooks/useQuickCapture';
import { type QuickCaptureTargetId } from '@/quick-capture/utils/quickCapture';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTargetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledHint = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
`;

const QUICK_CAPTURE_TARGET_OPTIONS: {
  id: QuickCaptureTargetId;
  Icon: IconComponent;
}[] = [
  { id: 'note', Icon: IconNotes },
  { id: 'task', Icon: IconCheckbox },
  { id: 'income', Icon: IconCurrencyEuro },
];

export const QuickCaptureSidePanelPage = () => {
  const { goBackFromSidePanel } = useSidePanelHistory();

  const {
    canSubmit,
    isSubmitting,
    quickCaptureTarget,
    quickCaptureText,
    setQuickCaptureTarget,
    setQuickCaptureText,
    submitQuickCapture,
  } = useQuickCapture();

  const quickCaptureTargetLabels: Record<QuickCaptureTargetId, string> = {
    note: t`Note`,
    task: t`Task`,
    income: t`Income`,
  };

  useHotkeysOnFocusedElement({
    keys: ['ctrl+Enter,meta+Enter'],
    callback: () => void submitQuickCapture(),
    focusId: SIDE_PANEL_FOCUS_ID,
    dependencies: [submitQuickCapture],
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void submitQuickCapture();

      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      goBackFromSidePanel();
    }
  };

  return (
    <StyledContainer>
      <StyledContent>
        <TextInput
          autoFocus
          fullWidth
          label={t`What do you want to capture?`}
          value={quickCaptureText}
          onChange={setQuickCaptureText}
          onKeyDown={handleKeyDown}
          placeholder={t`A thought, an idea, a to-do…`}
          dataTestId="quick-capture-text-input"
        />
        <StyledTargetRow>
          {QUICK_CAPTURE_TARGET_OPTIONS.map(({ id, Icon }) => (
            <Button
              key={id}
              Icon={Icon}
              title={quickCaptureTargetLabels[id]}
              ariaLabel={quickCaptureTargetLabels[id]}
              variant={quickCaptureTarget === id ? 'primary' : 'secondary'}
              accent={quickCaptureTarget === id ? 'blue' : 'default'}
              size="small"
              onClick={() => setQuickCaptureTarget(id)}
              dataTestId={`quick-capture-target-${id}`}
            />
          ))}
        </StyledTargetRow>
        <StyledHint>
          {t`Income and expenses are captured through the existing "Bilan : saisie rapide" command. Choosing Income opens it rather than creating a second income path.`}
        </StyledHint>
      </StyledContent>
      <SidePanelFooter
        actions={[
          <IconButton
            key="discard"
            size="small"
            variant="primary"
            Icon={IconTrash}
            ariaLabel={t`Discard`}
            onClick={goBackFromSidePanel}
          />,
          <Button
            key="capture"
            size="small"
            variant="primary"
            accent="blue"
            title={t`Capture`}
            Icon={IconPlus}
            hotkeys={[getOsControlSymbol(), '⏎']}
            onClick={() => void submitQuickCapture()}
            disabled={!canSubmit}
            isLoading={isSubmitting}
            dataTestId="quick-capture-submit"
          />,
        ]}
      />
    </StyledContainer>
  );
};
