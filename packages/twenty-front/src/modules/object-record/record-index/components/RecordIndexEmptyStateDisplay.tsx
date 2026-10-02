import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyContainer,
  AnimatedPlaceholderEmptySubTitle,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderEmptyTitle,
  type AnimatedPlaceholderType,
} from 'twenty-ui/feedback';
import { type IconComponent } from 'twenty-ui/icon';
import { Button, type ButtonVariant } from 'twenty-ui/input';

const StyledEmptyStateContainer = styled.div`
  height: 100%;
  width: 100%;
`;

type RecordIndexEmptyStateDisplayProps = {
  animatedPlaceholderType: AnimatedPlaceholderType;
  title: string;
  // Optional so a surface can show exactly one sentence (M13c) without an
  // empty subtitle node; every existing caller still passes both.
  subTitle?: string;
  ButtonIcon?: IconComponent;
  buttonTitle?: string;
  onButtonClick?: () => void;
  buttonVariant?: ButtonVariant;
  buttonDataTestId?: string;
  // Extra content below the button, so an A2E empty state can add its template
  // and help links without forking this host display.
  footer?: ReactNode;
  width?: number;
  dataTestId?: string;
};

export const RecordIndexEmptyStateDisplay = ({
  animatedPlaceholderType,
  title,
  subTitle,
  ButtonIcon,
  buttonTitle,
  onButtonClick,
  buttonVariant = 'secondary',
  buttonDataTestId,
  footer,
  width,
  dataTestId,
}: RecordIndexEmptyStateDisplayProps) => (
  <StyledEmptyStateContainer data-testid={dataTestId}>
    <AnimatedPlaceholderEmptyContainer width={width}>
      <AnimatedPlaceholder type={animatedPlaceholderType} />
      <AnimatedPlaceholderEmptyTextContainer>
        <AnimatedPlaceholderEmptyTitle>{title}</AnimatedPlaceholderEmptyTitle>
        {isDefined(subTitle) && (
          <AnimatedPlaceholderEmptySubTitle>
            {subTitle}
          </AnimatedPlaceholderEmptySubTitle>
        )}
      </AnimatedPlaceholderEmptyTextContainer>
      {isDefined(onButtonClick) && (
        <Button
          Icon={ButtonIcon}
          title={buttonTitle}
          variant={buttonVariant}
          onClick={onButtonClick}
          dataTestId={buttonDataTestId}
        />
      )}
      {isDefined(footer) && footer}
    </AnimatedPlaceholderEmptyContainer>
  </StyledEmptyStateContainer>
);
