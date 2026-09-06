import { randomUUID } from 'crypto';
import { expect, test } from './fixture';

// Signing up on the workspace subdomain the shared fixture points at is
// refused, so create the workspace from the base domain instead.
test.use({
  storageState: { cookies: [], origins: [] },
  baseURL: process.env.FRONTEND_BASE_URL ?? 'http://localhost:3001',
});

// P1.3 acceptance: creating a workspace and applying the `individual` preset
// hides the CRM navigation (Companies/People/Opportunities) while A2E app
// navigation (Documents, once its app is installed on the e2e server) shows.
test('Applying the individual template hides CRM navigation', async ({
  page,
  loginPage,
}) => {
  test.setTimeout(180000);

  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const email = `test${suffix}@apple.dev`;
  const workspaceName = `Test ${suffix}`;
  const subdomain = `test-${suffix}`;

  await test.step('Create a new account and workspace', async () => {
    await page.goto('/welcome');
    await loginPage.clickLoginWithEmailIfVisible();
    await loginPage.typeEmail(email);
    await loginPage.clickContinueButton();
    await loginPage.typePassword(process.env.DEFAULT_PASSWORD);
    await loginPage.clickSignUpButton();

    await expect(page.getByText('Create your workspace')).toBeVisible();
    await loginPage.typeWorkspaceName(workspaceName);
    await loginPage.typeSubdomain(subdomain);
    await loginPage.clickCreateWorkspaceButton();
  });

  await test.step('Reach the install-apps onboarding stage', async () => {
    // The install-apps step now also hosts the workspace-template picker;
    // both auto-skip variants still let the flow complete.
    const installAppsHeading = page.getByText('Install your first apps');
    const createProfileHeading = page.getByText('Create profile');

    await expect(installAppsHeading.or(createProfileHeading)).toBeVisible({
      timeout: 90000,
    });

    if (await installAppsHeading.isVisible()) {
      await loginPage.clickSkipOnboardingStep();
    }
  });

  await test.step('Apply the individual template from Settings', async () => {
    await page.goto('/settings/workspace/general');
    await expect(
      page.getByText('Workspace template', { exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Individual' }).click();
    await page.getByRole('button', { name: 'Apply template' }).click();

    await expect(page.getByText('Workspace template applied')).toBeVisible({
      timeout: 30000,
    });
  });

  await test.step('CRM navigation is hidden', async () => {
    // Close settings to reveal the main navigation drawer.
    await page.getByRole('button', { name: 'Exit Settings' }).click();

    await expect(
      page.getByRole('link', { name: 'Companies', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'People', exact: true }),
    ).toHaveCount(0);
  });
});
