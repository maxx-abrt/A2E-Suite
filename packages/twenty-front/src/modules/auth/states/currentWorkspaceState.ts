import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import {
  type Application,
  type Role,
  type Workspace,
} from '~/generated-metadata/graphql';

export type CurrentWorkspace = Pick<
  Workspace,
  | 'id'
  | 'inviteHash'
  | 'logo'
  | 'displayName'
  | 'allowImpersonation'
  | 'featureFlags'
  | 'activationStatus'
  | 'billingSubscriptions'
  | 'billingEntitlements'
  | 'billingCustomer'
  | 'currentBillingSubscription'
  | 'workspaceMembersCount'
  | 'isPublicInviteLinkEnabled'
  | 'workspaceDiscoverability'
  | 'isGoogleAuthEnabled'
  | 'isGoogleAuthBypassEnabled'
  | 'isMicrosoftAuthEnabled'
  | 'isMicrosoftAuthBypassEnabled'
  | 'isPasswordAuthEnabled'
  | 'isPasswordAuthBypassEnabled'
  | 'isCustomDomainEnabled'
  | 'hasValidSignedEnterpriseKey'
  | 'hasValidEnterpriseValidityToken'
  | 'subdomain'
  | 'customDomain'
  | 'workspaceUrls'
  | 'isTwoFactorAuthenticationEnforced'
  | 'trashRetentionDays'
  | 'eventLogRetentionDays'
  | 'fastModel'
  | 'smartModel'
  | 'aiAdditionalInstructions'
  | 'aiMonthlyTokenCap'
  | 'aiMonthlyTokenUsage'
  | 'editableProfileFields'
  | 'enabledAiModelIds'
  | 'useRecommendedModels'
  | 'isInternalMessagesImportEnabled'
> & {
  // Optional during the codegen window: older persisted workspaces and test
  // fixtures predate the field, and the availability hook falls back to the
  // instance-wide model list when it is absent.
  hasConfiguredAiProvider?: boolean;
  defaultRole?: Omit<Role, 'workspaceMembers' | 'agents' | 'apiKeys'> | null;
  workspaceCustomApplication: Pick<Application, 'id'> | null;
  installedApplications: Pick<
    Application,
    'id' | 'name' | 'universalIdentifier' | 'logoUrl'
  >[];
};

export const currentWorkspaceState = createAtomState<CurrentWorkspace | null>({
  key: 'currentWorkspaceState',
  defaultValue: null,
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
});
