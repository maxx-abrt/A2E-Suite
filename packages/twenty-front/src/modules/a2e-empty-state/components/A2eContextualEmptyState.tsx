import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';
import {
  A2E_EMPTY_STATE_SURFACES,
  type A2eEmptyStateSurfaceKey,
} from '@/a2e-empty-state/constants/A2eEmptyStateSurfaces';
import { RecordIndexEmptyStateDisplay } from '@/object-record/record-index/components/RecordIndexEmptyStateDisplay';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconLayoutGrid } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type A2eContextualEmptyStateProps = {
  surfaceKey: A2eEmptyStateSurfaceKey;
  // The surface's own create action. A2E empty states add no write path of
  // their own — the landing or record index passes the exact handler it uses
  // everywhere else.
  onPrimaryAction: () => void;
  width?: number;
  dataTestId?: string;
};

const StyledLinks = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: center;
`;

// The one contextual empty state shared by every Bureau + Agenda surface
// (M13c): the host `RecordIndexEmptyStateDisplay` shell plus exactly one
// sentence, one primary create action, one "Use a template" link into the
// shared M9 gallery and one "Learn more" link from the M12g slot. Reusing the
// host display is what keeps this from becoming a second empty-state system.
export const A2eContextualEmptyState = ({
  surfaceKey,
  onPrimaryAction,
  width,
  dataTestId = 'a2e-contextual-empty-state',
}: A2eContextualEmptyStateProps) => {
  const { t } = useLingui();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const surface = A2E_EMPTY_STATE_SURFACES[surfaceKey];

  return (
    <RecordIndexEmptyStateDisplay
      animatedPlaceholderType={surface.animatedPlaceholderType}
      title={t(surface.sentence)}
      ButtonIcon={surface.primaryActionIcon}
      buttonTitle={t(surface.primaryActionLabel)}
      onButtonClick={onPrimaryAction}
      buttonVariant="primary"
      buttonDataTestId={`a2e-empty-state-primary-${surfaceKey}`}
      width={width}
      dataTestId={dataTestId}
      footer={
        <StyledLinks>
          <Button
            Icon={IconLayoutGrid}
            title={t`Use a template`}
            variant="secondary"
            size="small"
            onClick={() =>
              openTemplateGallery({ category: surface.templateCategory })
            }
            dataTestId={`a2e-empty-state-template-${surfaceKey}`}
          />
          <A2eLearnMoreLink
            appKey={surface.appKey}
            dataTestId={`a2e-empty-state-learn-more-${surfaceKey}`}
          />
        </StyledLinks>
      }
    />
  );
};
