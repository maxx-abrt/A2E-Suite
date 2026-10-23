import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import { IconCheck, IconX } from 'twenty-ui/icon';
import { LightIconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledForm = styled.form`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledEntry = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 32px;

  &:focus-within {
    box-shadow: inset 0 -1px ${themeCssVariables.color.blue};
  }
`;

const StyledInput = styled.input`
  background: transparent;
  border: none;
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font: inherit;
  min-width: 0;
  outline: none;
  padding: ${themeCssVariables.spacing[1]} 0;

  &::placeholder {
    color: ${themeCssVariables.font.color.tertiary};
  }
`;

const StyledError = styled.span`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  padding-bottom: ${themeCssVariables.spacing[1]};
`;

type RecordQuickCreateFormProps = {
  label: string;
  onCreate: (title: string) => Promise<unknown>;
  onCancel: () => void;
  onCreated?: () => void;
  onBusyChange?: (isBusy: boolean) => void;
};

export const RecordQuickCreateForm = ({
  label,
  onCreate,
  onCancel,
  onCreated,
  onBusyChange,
}: RecordQuickCreateFormProps) => {
  const { t } = useLingui();
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (isCreating || title.trim().length === 0) return;
    setIsCreating(true);
    onBusyChange?.(true);
    setHasError(false);
    try {
      await onCreate(title.trim());
      setTitle('');
      inputRef.current?.focus();
      onCreated?.();
    } catch {
      setHasError(true);
      inputRef.current?.focus();
    } finally {
      setIsCreating(false);
      onBusyChange?.(false);
    }
  };

  return (
    <StyledForm
      aria-label={label}
      aria-busy={isCreating}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void submit();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter' && event.nativeEvent.isComposing) {
          event.preventDefault();
        }
        if (event.key === 'Escape' && !isCreating) {
          event.preventDefault();
          onCancel();
        }
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <StyledEntry>
        <StyledInput
          ref={inputRef}
          autoFocus
          aria-label={label}
          aria-invalid={hasError}
          placeholder={label}
          value={title}
          readOnly={isCreating}
          onChange={(event) => setTitle(event.target.value)}
        />
        <LightIconButton
          Icon={IconCheck}
          aria-label={t`Create`}
          disabled={isCreating || title.trim().length === 0}
        />
        <LightIconButton
          Icon={IconX}
          aria-label={t`Cancel`}
          disabled={isCreating}
          onClick={(event) => {
            event.preventDefault();
            onCancel();
          }}
        />
      </StyledEntry>
      {hasError && (
        <StyledError role="alert">{t`Could not create. Your text is kept; try again.`}</StyledError>
      )}
    </StyledForm>
  );
};
