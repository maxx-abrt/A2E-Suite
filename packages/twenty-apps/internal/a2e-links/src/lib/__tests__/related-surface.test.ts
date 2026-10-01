import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STANDARD_PAGE_LAYOUT } from 'twenty-sdk/define';

import {
  DOCUMENT_RECORD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  FRONT_COMPONENT_IDS,
  PAGE_LAYOUT_TAB_IDS,
} from '../../constants/universal-identifiers.ts';

// Manifest-declaration walk for the M11a-i3 "Related" surface. The tabs and
// their FRONT_COMPONENT widgets are app-owned standalone declarations, so a
// green suite here is the cheapest proof that the surface is mounted on both
// first consumer targets and disappears with the app on uninstall (C3). The
// live install and browser legs stay Tier 2.

type WidgetDefinition = {
  universalIdentifier: string;
  title: string;
  type: string;
  configuration: {
    configurationType: string;
    frontComponentUniversalIdentifier?: string;
  };
};

type TabDefinition = {
  universalIdentifier: string;
  pageLayoutUniversalIdentifier: string;
  title: string;
  widgets: WidgetDefinition[];
};

type DefinitionResult<TDefinition> = {
  success: boolean;
  config: TDefinition;
  errors?: unknown[];
};

const unwrap = async <TDefinition>(
  modulePath: string,
): Promise<TDefinition> => {
  const module = (await import(modulePath)) as {
    default: DefinitionResult<TDefinition>;
  };

  assert.equal(
    module.default.success,
    true,
    `invalid definition: ${modulePath}`,
  );

  return module.default.config;
};

test('the document Related tab extends the A2E Documents record page', async () => {
  const tab = await unwrap<TabDefinition>(
    '../../page-layout-tabs/document-related.page-layout-tab.ts',
  );

  assert.equal(tab.universalIdentifier, PAGE_LAYOUT_TAB_IDS.documentRelated);
  assert.equal(
    tab.pageLayoutUniversalIdentifier,
    DOCUMENT_RECORD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  );
  assert.equal(tab.widgets.length, 1);
  assert.equal(tab.widgets[0].type, 'FRONT_COMPONENT');
  assert.equal(
    tab.widgets[0].configuration.frontComponentUniversalIdentifier,
    FRONT_COMPONENT_IDS.documentRelatedLinks,
  );
});

test('the task Related tab extends the standard task record page', async () => {
  const tab = await unwrap<TabDefinition>(
    '../../page-layout-tabs/task-related.page-layout-tab.ts',
  );

  assert.equal(tab.universalIdentifier, PAGE_LAYOUT_TAB_IDS.taskRelated);
  assert.equal(
    tab.pageLayoutUniversalIdentifier,
    STANDARD_PAGE_LAYOUT.taskRecordPage.universalIdentifier,
  );
  assert.equal(tab.widgets.length, 1);
  assert.equal(
    tab.widgets[0].configuration.frontComponentUniversalIdentifier,
    FRONT_COMPONENT_IDS.taskRelatedLinks,
  );
});

test('the two Related tabs are distinct and app-owned declarations', async () => {
  const documentTab = await unwrap<TabDefinition>(
    '../../page-layout-tabs/document-related.page-layout-tab.ts',
  );
  const taskTab = await unwrap<TabDefinition>(
    '../../page-layout-tabs/task-related.page-layout-tab.ts',
  );

  assert.notEqual(documentTab.universalIdentifier, taskTab.universalIdentifier);
  assert.notEqual(
    documentTab.pageLayoutUniversalIdentifier,
    taskTab.pageLayoutUniversalIdentifier,
  );
  assert.notEqual(
    documentTab.widgets[0].configuration.frontComponentUniversalIdentifier,
    taskTab.widgets[0].configuration.frontComponentUniversalIdentifier,
  );
});
