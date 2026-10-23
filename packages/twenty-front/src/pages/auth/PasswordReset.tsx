import { useAuth } from '@/auth/hooks/useAuth';
import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { SignInUpStandardContent } from '@/auth/sign-in-up/components/SignInUpStandardContent';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { currentUserState } from '@/auth/states/currentUserState';
import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { PASSWORD_REGEX } from '@/auth/utils/passwordRegex';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { TextInput } from '@/ui/input/components/TextInput';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation, useQuery } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { Loader } from 'twenty-ui/feedback';
import { MainButton } from 'twenty-ui/input';
import { ClickToActionLink } from 'twenty-ui/navigation';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { z } from 'zod';
import {
  UpdatePasswordViaResetTokenDocument,
  ValidatePasswordResetTokenDocument,
} from '~/generated-metadata/graphql';
import { useNavigateApp } from '~/hooks/useNavigateApp';

type PasswordResetForm = { newPassword: string; confirmPassword: string };

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  max-width: 360px;
  width: 100%;
`;

const StyledStatus = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  max-width: 360px;
  width: 100%;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  line-height: 1.6;
  margin: 0;
  text-align: center;
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const PasswordResetContent = ({
  passwordResetToken,
}: {
  passwordResetToken?: string;
}) => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const currentUser = useAtomStateValue(currentUserState);
  const setCurrentUser = useSetAtomState(currentUserState);
  const navigate = useNavigateApp();
  const { signOut } = useAuth();
  const isLogged = useIsLogged();
  const [isComplete, setIsComplete] = useState(false);

  const validationSchema = z
    .object({
      newPassword: z
        .string()
        .regex(PASSWORD_REGEX, t`Password must be between 8 and 50 characters`),
      confirmPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      message: t`Passwords do not match`,
      path: ['confirmPassword'],
    });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PasswordResetForm>({
    mode: 'onBlur',
    defaultValues: { newPassword: '', confirmPassword: '' },
    resolver: zodResolver(validationSchema),
  });
  const { data, error, loading, refetch } = useQuery(
    ValidatePasswordResetTokenDocument,
    {
      variables: { token: passwordResetToken ?? '' },
      skip: !passwordResetToken,
      fetchPolicy: 'network-only',
    },
  );
  const [updatePasswordViaToken] = useMutation(
    UpdatePasswordViaResetTokenDocument,
  );
  const targetUser = data?.validatePasswordResetToken;
  const isCurrentAccount = isLogged && currentUser?.id === targetUser?.id;

  const returnToAccount = async () => {
    if (isLogged && !isCurrentAccount) {
      await signOut();
      return;
    }
    navigate(isCurrentAccount ? AppPath.Index : AppPath.SignInUp);
  };

  const onSubmit = async (formData: PasswordResetForm) => {
    if (!passwordResetToken || !targetUser || isComplete) return;
    try {
      const result = await updatePasswordViaToken({
        variables: {
          token: passwordResetToken,
          newPassword: formData.newPassword,
        },
      });
      if (result.data?.updatePasswordViaResetToken.success !== true) {
        enqueueErrorSnackBar({
          message: t`There was an error while updating password.`,
        });
        return;
      }
      if (isCurrentAccount) {
        setCurrentUser((user) =>
          user ? { ...user, hasPassword: true } : user,
        );
      }
      setIsComplete(true);
    } catch (mutationError) {
      enqueueErrorSnackBar(
        CombinedGraphQLErrors.is(mutationError)
          ? { apolloError: mutationError }
          : {
              message: t`We could not update your password. Please try again.`,
            },
      );
    }
  };

  const backToSignIn = (
    <ClickToActionLink onClick={returnToAccount}>
      {isCurrentAccount ? t`Continue to workspace` : t`Back to sign in`}
    </ClickToActionLink>
  );

  let title = targetUser?.hasPassword
    ? t`Reset your password`
    : t`Set your password`;
  let content;

  if (isComplete) {
    title = t`Your password is ready`;
    content = (
      <StyledStatus role="status">
        <StyledDescription>{t`Your password has been saved. You can now sign in with your new password.`}</StyledDescription>
        {backToSignIn}
      </StyledStatus>
    );
  } else if (loading) {
    title = t`Checking your reset link`;
    content = (
      <StyledStatus role="status">
        <Loader />
        <StyledDescription>{t`One moment while we check your link.`}</StyledDescription>
      </StyledStatus>
    );
  } else if (error || !targetUser || !passwordResetToken) {
    title = t`Unable to open this reset link`;
    content = (
      <StyledStatus role="alert">
        <StyledDescription>{t`The link may have expired or already been used. Request a new link from the sign-in screen, or try again if your connection was interrupted.`}</StyledDescription>
        {error && (
          <MainButton
            title={t`Try again`}
            variant="secondary"
            onClick={() => {
              void refetch().catch(() => undefined);
            }}
            fullWidth
          />
        )}
        {backToSignIn}
      </StyledStatus>
    );
  } else {
    content = (
      <StyledForm
        onSubmit={handleSubmit(onSubmit)}
        aria-label={t`Reset password`}
      >
        <StyledDescription>{t`Choose a new password for ${targetUser.email}.`}</StyledDescription>
        <Controller
          name="newPassword"
          control={control}
          render={({ field, fieldState }) => (
            <StyledField>
              {t`New password`}
              <TextInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                type="password"
                autoComplete="new-password"
                autoFocus
                fullWidth
                error={fieldState.error?.message}
                disabled={isSubmitting}
              />
            </StyledField>
          )}
        />
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field, fieldState }) => (
            <StyledField>
              {t`Confirm password`}
              <TextInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                type="password"
                autoComplete="new-password"
                fullWidth
                error={fieldState.error?.message}
                disabled={isSubmitting}
              />
            </StyledField>
          )}
        />
        <MainButton
          title={isSubmitting ? t`Saving password…` : t`Save password`}
          variant="primary"
          type="submit"
          fullWidth
          disabled={isSubmitting}
        />
        {backToSignIn}
      </StyledForm>
    );
  }

  return (
    <SignInUpStandardContent
      workspacePublicData={workspacePublicData}
      signInUpStep={SignInUpStep.Password}
      title={title}
      signInUpForm={content}
      onClickOnLogo={() => navigate(AppPath.SignInUp)}
    />
  );
};

export const PasswordReset = () => {
  const { passwordResetToken } = useParams();
  return (
    <PasswordResetContent
      key={passwordResetToken}
      passwordResetToken={passwordResetToken}
    />
  );
};
