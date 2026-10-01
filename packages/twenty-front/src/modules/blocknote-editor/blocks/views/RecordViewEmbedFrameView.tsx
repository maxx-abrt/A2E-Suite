import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledEmbedContainer = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  margin: ${themeCssVariables.spacing[2]} 0;
  overflow: hidden;
`;

const StyledEmbedHeader = styled.div`
  background: ${themeCssVariables.background.transparent.light};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

export type RecordViewEmbedFrameViewProps = {
  title?: string;
  children: ReactNode;
};

// Provider-free chrome around an embedded native view. The host fills it with
// the live record-table widget; stories fill it with the safe stub.
export const RecordViewEmbedFrameView = ({
  title,
  children,
}: RecordViewEmbedFrameViewProps) => (
  <StyledEmbedContainer contentEditable={false}>
    {isNonEmptyString(title) && <StyledEmbedHeader>{title}</StyledEmbedHeader>}
    {children}
  </StyledEmbedContainer>
);
