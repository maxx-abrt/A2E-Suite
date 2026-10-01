import { styled } from '@linaria/react';
import { IconLink } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBookmarkCard = styled.a`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  max-width: 100%;
  padding: ${themeCssVariables.spacing[2]};
  text-decoration: none;
  width: fit-content;

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
  }
`;

const StyledBookmarkBody = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StyledBookmarkTitle = styled.span`
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledBookmarkHostname = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export type BookmarkCardViewProps = {
  url: string;
  title: string;
  hostname: string;
};

// Provider-free view of a saved bookmark. The URL input lives in the block and
// only hands the resolved card here once a hostname is known.
export const BookmarkCardView = ({
  url,
  title,
  hostname,
}: BookmarkCardViewProps) => (
  <StyledBookmarkCard
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    contentEditable={false}
  >
    <IconLink size={16} />
    <StyledBookmarkBody>
      <StyledBookmarkTitle>{title || hostname}</StyledBookmarkTitle>
      <StyledBookmarkHostname>{hostname}</StyledBookmarkHostname>
    </StyledBookmarkBody>
  </StyledBookmarkCard>
);
