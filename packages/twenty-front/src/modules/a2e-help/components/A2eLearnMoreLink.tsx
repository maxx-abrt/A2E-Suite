import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';
import { IconHelpCircle } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type A2eHelpAppKey,
  A2E_HELP_DOC_PAGES,
  getA2eHelpDocUrl,
} from '@/a2e-help/constants/A2eHelpDocPages';

export type A2eLearnMoreLinkProps = {
  // Which app's doc page to open. `undefined` renders nothing, so an
  // app-owned empty state can degrade cleanly for a non-installed app.
  appKey?: A2eHelpAppKey;
  dataTestId?: string;
};

const StyledLink = styled.a`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  text-decoration: none;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
    text-decoration: underline;
  }
`;

// The single "Learn more" slot (M12g) every empty state will reuse so a help
// destination is one click from where the user is. External doc page, opened
// in a new tab so the workbench is never lost.
export const A2eLearnMoreLink = ({
  appKey,
  dataTestId,
}: A2eLearnMoreLinkProps) => {
  const { t } = useLingui();

  if (!isDefined(appKey)) {
    return null;
  }

  return (
    <StyledLink
      href={getA2eHelpDocUrl(appKey)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={dataTestId ?? `a2e-learn-more-${appKey}`}
    >
      <IconHelpCircle size={14} />
      {t(A2E_HELP_DOC_PAGES[appKey].label)} · {t`Learn more`}
    </StyledLink>
  );
};
