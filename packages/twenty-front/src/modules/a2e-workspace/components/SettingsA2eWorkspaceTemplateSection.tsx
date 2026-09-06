import { A2eWorkspaceTemplatePicker } from '@/a2e-workspace/components/A2eWorkspaceTemplatePicker';
import { A2E_WORKSPACE_TEMPLATE_OPTIONS } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { useLingui } from '@lingui/react/macro';
import { Section } from 'twenty-ui/layout';
import { H2Title } from 'twenty-ui/typography';

export const SettingsA2eWorkspaceTemplateSection = () => {
  const { t } = useLingui();

  return (
    <Section>
      <H2Title
        title={t`Workspace template`}
        description={t`Pre-installs A2E apps and tunes the navigation for how you work. Re-runnable at any time.`}
      />
      <A2eWorkspaceTemplatePicker options={A2E_WORKSPACE_TEMPLATE_OPTIONS} />
    </Section>
  );
};
