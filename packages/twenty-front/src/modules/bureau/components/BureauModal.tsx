import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { isModalOpenedComponentState } from '@/ui/layout/modal/states/isModalOpenedComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContent = styled.div`
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  max-height: 70dvh;
  min-height: 0;
  overflow: auto;
  h2 {
    font-size: ${themeCssVariables.font.size.lg};
    margin: 0;
  }
`;

type BureauModalProps = {
  modalId: string;
  children: ReactNode;
  isBusy?: boolean;
  width?: string;
};

export const BureauModal = ({
  modalId,
  children,
  isBusy = false,
  width,
}: BureauModalProps) => {
  const scopedModalId = useWorkspaceSurfaceScopedComponentInstanceId(modalId);
  const isModalOpened = useAtomComponentStateValue(
    isModalOpenedComponentState,
    scopedModalId,
  );

  return (
    <ModalStatefulWrapper
      modalInstanceId={modalId}
      width={width}
      isClosable
      renderInDocumentBody
      shouldCloseModalOnClickOutsideOrEscape={!isBusy}
    >
      {isModalOpened && <StyledContent>{children}</StyledContent>}
    </ModalStatefulWrapper>
  );
};
