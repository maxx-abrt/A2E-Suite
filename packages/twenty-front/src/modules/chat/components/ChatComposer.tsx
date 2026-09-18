import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { IconMoodSmile, IconPaperclip, IconSend } from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CHAT_EMOJI_PALETTE } from '@/chat/constants/ChatEmojiPalette';
import { type ChatMentionCandidate } from '@/chat/hooks/useChatMentionCandidates';
import {
  getChatMentionQueryFromDraft,
  insertChatMentionIntoDraft,
} from '@/chat/utils/chatMentionDraft';

const MENTION_SEARCH_DEBOUNCE_MS = 150;

const StyledComposer = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledInputRow = styled.div`
  align-items: flex-end;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTextArea = styled.textarea`
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-height: 36px;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  resize: none;

  &:focus {
    outline: none;
  }
`;

const StyledPopup = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  display: flex;
  flex-direction: column;
  max-height: 180px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[1]};
`;

const StyledEmojiGrid = styled(StyledPopup)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  max-height: none;
`;

const StyledEmojiButton = styled.button`
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: ${themeCssVariables.spacing[1]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledCandidateButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: left;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach?: () => void;
  searchMentionCandidates?: (query: string) => Promise<ChatMentionCandidate[]>;
  isSending?: boolean;
};

export const ChatComposer = ({
  value,
  onChange,
  onSubmit,
  onAttach,
  searchMentionCandidates,
  isSending = false,
}: ChatComposerProps) => {
  const { t } = useLingui();
  const [mentionCandidates, setMentionCandidates] = useState<
    ChatMentionCandidate[]
  >([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const mentionQuery = getChatMentionQueryFromDraft(value);

  useEffect(() => {
    if (mentionQuery === null || searchMentionCandidates === undefined) {
      setMentionCandidates([]);

      return;
    }

    let isCurrentSearch = true;

    const timeoutId = setTimeout(async () => {
      const candidates = await searchMentionCandidates(mentionQuery);

      if (isCurrentSearch) {
        setMentionCandidates(candidates);
      }
    }, MENTION_SEARCH_DEBOUNCE_MS);

    return () => {
      isCurrentSearch = false;
      clearTimeout(timeoutId);
    };
  }, [mentionQuery, searchMentionCandidates]);

  const selectCandidate = (candidate: ChatMentionCandidate) => {
    onChange(
      insertChatMentionIntoDraft({
        draft: value,
        label: candidate.label,
        workspaceMemberId: candidate.id,
      }),
    );
    setMentionCandidates([]);
  };

  const insertEmoji = (emoji: string) => {
    onChange(`${value}${emoji}`);
    setIsEmojiPickerOpen(false);
  };

  const isSubmitDisabled = value.trim().length === 0 || isSending;

  return (
    <StyledComposer data-testid="chat-composer">
      {mentionCandidates.length > 0 && (
        <StyledPopup data-testid="chat-mention-popup">
          {mentionCandidates.map((candidate) => (
            <StyledCandidateButton
              key={candidate.id}
              type="button"
              data-testid={`chat-mention-candidate-${candidate.id}`}
              onClick={() => selectCandidate(candidate)}
            >
              {candidate.label}
            </StyledCandidateButton>
          ))}
        </StyledPopup>
      )}
      {isEmojiPickerOpen && (
        <StyledEmojiGrid data-testid="chat-emoji-picker">
          {CHAT_EMOJI_PALETTE.map((emoji) => (
            <StyledEmojiButton
              key={emoji}
              type="button"
              aria-label={emoji}
              data-testid={`chat-emoji-${emoji}`}
              onClick={() => insertEmoji(emoji)}
            >
              {emoji}
            </StyledEmojiButton>
          ))}
        </StyledEmojiGrid>
      )}
      <StyledInputRow>
        {onAttach !== undefined && (
          <IconButton
            Icon={IconPaperclip}
            variant="tertiary"
            ariaLabel={t`Attach a file`}
            dataTestId="chat-composer-attach"
            onClick={onAttach}
          />
        )}
        <IconButton
          Icon={IconMoodSmile}
          variant="tertiary"
          ariaLabel={t`Insert emoji`}
          dataTestId="chat-composer-emoji-toggle"
          onClick={() => setIsEmojiPickerOpen((isOpen) => !isOpen)}
        />
        <StyledTextArea
          data-testid="chat-composer-input"
          value={value}
          placeholder={t`Write a message…`}
          aria-label={t`Message`}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <IconButton
          Icon={IconSend}
          variant="secondary"
          accent="blue"
          ariaLabel={t`Send message`}
          dataTestId="chat-composer-send"
          disabled={isSubmitDisabled}
          onClick={onSubmit}
        />
      </StyledInputRow>
    </StyledComposer>
  );
};
