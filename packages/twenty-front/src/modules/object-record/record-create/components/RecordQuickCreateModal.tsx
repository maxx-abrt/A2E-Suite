import { RecordQuickCreateForm } from '@/object-record/record-create/components/RecordQuickCreateForm';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledHeading = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  margin: 0 0 ${themeCssVariables.spacing[3]};
`;

type RecordQuickCreateModalProps = {
  modalId: string;
  objectNameSingular: string;
  onCreate: (title: string) => Promise<unknown>;
  onClose: () => void;
};

export const RecordQuickCreateModal = ({
  modalId,
  objectNameSingular,
  onCreate,
  onClose,
}: RecordQuickCreateModalProps) => {
  const { t } = useLingui();
  const { openModal, closeModal } = useModal();
  const [isBusy, setIsBusy] = useState(false);
  const label = objectNameSingular === 'task' ? t`New task` : t`New project`;

  useEffect(() => {
    openModal(modalId);
    return () => closeModal(modalId);
  }, [openModal, closeModal, modalId]);

  const finish = () => {
    closeModal(modalId);
    onClose();
  };

  return (
    <ModalStatefulWrapper
      modalInstanceId={modalId}
      isClosable
      onClose={() => {
        if (!isBusy) finish();
      }}
      shouldCloseModalOnClickOutsideOrEscape={!isBusy}
      renderInDocumentBody
      narrowWidth
      autoHeight
    >
      <div role="dialog" aria-modal="true" aria-label={label}>
        <StyledHeading>{label}</StyledHeading>
        <RecordQuickCreateForm
          label={
            objectNameSingular === 'task' ? t`Task title` : t`Project name`
          }
          onCreate={onCreate}
          onCancel={finish}
          onCreated={finish}
          onBusyChange={setIsBusy}
        />
      </div>
    </ModalStatefulWrapper>
  );
};
