import { BureauLanding } from '@/bureau/components/BureauLanding';
import { BureauImportModal } from '@/bureau/components/BureauImportModal';
import { BureauPageView } from '@/bureau/components/BureauPageView';
import { BureauSearchModal } from '@/bureau/components/BureauSearchModal';
import { BureauTrashModal } from '@/bureau/components/BureauTrashModal';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { useIsBureauAvailable } from '@/bureau/hooks/useIsBureauAvailable';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useNavigate, useParams } from 'react-router-dom';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBureauPage = styled.main`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

export const BureauPage = () => {
  const { t } = useLingui();
  const isAvailable = useIsBureauAvailable();

  if (!isAvailable)
    return (
      <StyledBureauPage>
        <PageTitle title={t`Bureau`} />
        <p>{t`Install Bureau to start writing and organizing your pages. If it is already installed, check its status in Applications.`}</p>
        <Button
          title={t`Open Applications`}
          to={getSettingsPath(SettingsPath.Applications)}
        />
      </StyledBureauPage>
    );

  return <BureauWorkspaceContent />;
};

const BureauWorkspaceContent = () => {
  const { t } = useLingui();
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { actions } = useBureauWorkspace();

  return (
    <StyledBureauPage data-testid="bureau-page">
      <PageTitle title={t`Bureau`} />
      {documentId ? (
        <BureauPageView key={documentId} documentId={documentId} />
      ) : (
        <BureauLanding
          onCreatePage={() => {
            void actions.createPage();
          }}
          onSelectPage={(pageId) => {
            navigate(getBureauPagePath(pageId));
          }}
        />
      )}
      <BureauSearchModal />
      <BureauTrashModal />
      <BureauImportModal />
    </StyledBureauPage>
  );
};
