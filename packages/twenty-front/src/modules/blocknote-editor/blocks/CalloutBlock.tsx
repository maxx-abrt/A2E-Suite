import { createReactBlockSpec } from '@blocknote/react';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCallout = styled.div`
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin: ${themeCssVariables.spacing[1]} 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledEmoji = styled.div`
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  user-select: none;
  width: 24px;
`;

const StyledContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CALLOUT_EMOJIS = ['💡', '⚠️', 'ℹ️', '✅', '🔥'] as const;

export const CalloutBlock = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      emoji: {
        default: '💡',
      },
    },
    content: 'inline',
  },
  {
    render: ({ block, editor, contentRef }) => {
      const currentEmojiIndex = CALLOUT_EMOJIS.indexOf(
        block.props.emoji as (typeof CALLOUT_EMOJIS)[number],
      );

      const handleEmojiClick = () => {
        editor.updateBlock(block.id, {
          props: {
            emoji:
              CALLOUT_EMOJIS[(currentEmojiIndex + 1) % CALLOUT_EMOJIS.length],
          },
        });
      };

      return (
        <StyledCallout>
          <StyledEmoji onClick={handleEmojiClick}>
            {block.props.emoji}
          </StyledEmoji>
          <StyledContent ref={contentRef} />
        </StyledCallout>
      );
    },
  },
);
