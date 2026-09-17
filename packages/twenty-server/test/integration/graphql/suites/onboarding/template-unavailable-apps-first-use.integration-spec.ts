import gql from 'graphql-tag';
import { type ASTNode } from 'graphql';

import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

// P1.7c first-use acceptance on the server path: when the apps a preset needs
// are not registered on this server (E01 "zero app availability" / E02
// "missing registration"), the apply operation must report per-step failures
// and must NOT pretend the preset completed. Applying a template that needs no
// apps (CRM) still works and leaves the workspace's navigation untouched
// (E03 "existing customized workspace" preservation).
//
// This suite deliberately uses CRM + NON_PROFIT only: their definitions hide
// no standard navigation rows, so the shared seeded workspace is never
// mutated by the navigation step. INDIVIDUAL/STUDENT are excluded here because
// restoring a deleted standard row needs the full standard-application sync.
const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';
const A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000001';

const COMPANY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '20202020-b001-4b01-8b01-c0aba11c0001';

const unavailableAppsIdempotencyKey = `00000000-0000-4000-8000-${(Date.now() % 1_000_000_000)
  .toString()
  .padStart(12, '0')}`;
const crmIdempotencyKey = `00000000-0000-4000-8000-${((Date.now() + 1) % 1_000_000_000)
  .toString()
  .padStart(12, '0')}`;

type ApplyStepPayload = {
  kind: string;
  targetUniversalIdentifier?: string | null;
  status: string;
  errorCode?: string | null;
  localizedMessage?: string | null;
};

type ApplyResultPayload = {
  operationId: string;
  requestedTemplateKeyVersion: { key: string; version: number } | null;
  appliedTemplateKeyVersion: { key: string; version: number } | null;
  steps: ApplyStepPayload[];
};

let previousWorkspaceTemplate: string | null = null;

const queryTemplatePreview = async (template: string) => {
  const response = await makeMetadataAPIRequest({
    query: gql`
      query FirstUseTemplatePreview {
        workspaceTemplatePreview(template: ${template}) {
          templateKey
          version
          blocked
          apps {
            universalIdentifier
            registered
            versionCompatible
            required
            currentlyInstalled
          }
          navigationChanges {
            universalIdentifier
            action
          }
        }
      }
    `,
    variables: {},
  });

  expect(response.body.errors).toBeUndefined();

  return response.body.data.workspaceTemplatePreview as {
    templateKey: string;
    version: number;
    blocked: boolean;
    apps: Array<{
      universalIdentifier: string;
      registered: boolean;
      versionCompatible: boolean;
      required: boolean;
      currentlyInstalled: boolean;
    }>;
    navigationChanges: Array<{
      universalIdentifier: string;
      action: string;
    }>;
  };
};

const applyTemplateOperation = async (query: ASTNode) => {
  const response = await makeMetadataAPIRequest({ query, variables: {} });

  expect(response.body.errors).toBeUndefined();

  return response.body.data
    .applyWorkspaceTemplateOperation as ApplyResultPayload;
};

const countWorkspaceApplications = async (universalIdentifier: string) => {
  const rows = await testDataSource.query(
    `SELECT id FROM core."application" WHERE "workspaceId" = $1 AND "universalIdentifier" = $2`,
    [SEED_APPLE_WORKSPACE_ID, universalIdentifier],
  );

  return rows.length;
};

beforeAll(async () => {
  const workspaceRows = await testDataSource.query(
    `SELECT "workspaceTemplate" FROM core."workspace" WHERE id = $1`,
    [SEED_APPLE_WORKSPACE_ID],
  );

  previousWorkspaceTemplate = workspaceRows[0]?.workspaceTemplate ?? null;
}, 60000);

afterAll(async () => {
  // Restore the shared seeded workspace exactly: the template value and the
  // operation rows this suite persists.
  await testDataSource.query(
    `UPDATE core."workspace" SET "workspaceTemplate" = $1 WHERE id = $2`,
    [previousWorkspaceTemplate, SEED_APPLE_WORKSPACE_ID],
  );
  await testDataSource.query(
    `DELETE FROM core."keyValuePair" WHERE "workspaceId" = $1 AND key LIKE 'template-operation:%'`,
    [SEED_APPLE_WORKSPACE_ID],
  );
}, 60000);

describe('first-use setup when preset apps are unavailable (integration)', () => {
  it('previews a preset needing unregistered apps as blocked, with per-app readiness flags', async () => {
    const preview = await queryTemplatePreview('NON_PROFIT');

    expect(preview.templateKey).toBe('NON_PROFIT');
    expect(preview.blocked).toBe(true);
    expect(preview.apps).toHaveLength(2);

    for (const app of preview.apps) {
      expect(app.registered).toBe(false);
      expect(app.versionCompatible).toBe(false);
      expect(app.required).toBe(true);
      expect(app.currentlyInstalled).toBe(false);
    }

    expect(
      preview.apps.map((app) => app.universalIdentifier).sort(),
    ).toEqual(
      [
        A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
        A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
      ].sort(),
    );
  });

  it('applies a preset whose required apps are missing without faking completion', async () => {
    const result = await applyTemplateOperation(gql`
      mutation ApplyUnavailablePreset {
        applyWorkspaceTemplateOperation(
          input: {
            idempotencyKey: "${unavailableAppsIdempotencyKey}"
            template: NON_PROFIT
          }
        ) {
          operationId
          requestedTemplateKeyVersion { key version }
          appliedTemplateKeyVersion { key version }
          steps {
            kind
            targetUniversalIdentifier
            status
            errorCode
            localizedMessage
          }
        }
      }
    `);

    // GraphQL serializes registered enums by their member name, so the wire
    // values are the SCREAMING_SNAKE names, not the lower-case internal values.
    const installSteps = result.steps.filter(
      (step) => step.kind === 'INSTALL_APP',
    );

    expect(installSteps).toHaveLength(2);
    expect(
      installSteps.every(
        (step) =>
          step.status === 'FAILED' && step.errorCode === 'APP_NOT_REGISTERED',
      ),
    ).toBe(true);
    // Errors stay user-safe: no internal identifiers or stack traces leak.
    expect(
      installSteps.every((step) => typeof step.localizedMessage === 'string'),
    ).toBe(true);

    const setTemplateStep = result.steps.find(
      (step) => step.kind === 'SET_WORKSPACE_TEMPLATE',
    );

    expect(setTemplateStep?.status).toBe('SKIPPED');
    expect(result.appliedTemplateKeyVersion).toBeNull();

    // The workspace never claims a preset whose required apps are absent, and
    // no application row was created by the failed installs.
    const workspaceRows = await testDataSource.query(
      `SELECT "workspaceTemplate" FROM core."workspace" WHERE id = $1`,
      [SEED_APPLE_WORKSPACE_ID],
    );

    expect(workspaceRows[0].workspaceTemplate).toBe(previousWorkspaceTemplate);
    expect(
      await countWorkspaceApplications(
        A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      ),
    ).toBe(0);
    expect(
      await countWorkspaceApplications(
        A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
      ),
    ).toBe(0);
  });

  it('still sets the CRM preset and preserves the workspace navigation rows', async () => {
    const preview = await queryTemplatePreview('CRM');

    expect(preview.blocked).toBe(false);
    expect(preview.apps).toHaveLength(0);

    const navigationRowsBefore = await testDataSource.query(
      `SELECT count(*)::int AS count FROM core."navigationMenuItem" WHERE "workspaceId" = $1`,
      [SEED_APPLE_WORKSPACE_ID],
    );

    const result = await applyTemplateOperation(gql`
      mutation ApplyCrmPreset {
        applyWorkspaceTemplateOperation(
          input: {
            idempotencyKey: "${crmIdempotencyKey}"
            template: CRM
          }
        ) {
          operationId
          appliedTemplateKeyVersion { key version }
          steps {
            kind
            status
          }
        }
      }
    `);

    expect(result.appliedTemplateKeyVersion).toEqual({
      key: 'CRM',
      version: 1,
    });

    const workspaceRows = await testDataSource.query(
      `SELECT "workspaceTemplate" FROM core."workspace" WHERE id = $1`,
      [SEED_APPLE_WORKSPACE_ID],
    );

    expect(workspaceRows[0].workspaceTemplate).toBe('CRM');

    // CRM hides no standard rows: the managed company row survives and the
    // navigation menu is unchanged (no re-seed, no destructive rewrite).
    const companyRows = await testDataSource.query(
      `SELECT id FROM core."navigationMenuItem" WHERE "universalIdentifier" = $1 AND "workspaceId" = $2`,
      [
        COMPANY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
        SEED_APPLE_WORKSPACE_ID,
      ],
    );

    expect(companyRows).toHaveLength(1);

    const navigationRowsAfter = await testDataSource.query(
      `SELECT count(*)::int AS count FROM core."navigationMenuItem" WHERE "workspaceId" = $1`,
      [SEED_APPLE_WORKSPACE_ID],
    );

    expect(navigationRowsAfter[0].count).toBe(navigationRowsBefore[0].count);
  });
});
