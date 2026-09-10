import { type Page } from '@playwright/test';
import { expect, test } from '../lib/fixtures/screenshot';

// Happy path for the workbench shell: two records opened as side-panel tabs,
// switch between them, close one, reload — the remaining tab is restored.
// Anchors on the real testids: `side-panel-open-in-tab-button`,
// `side-panel-tab-strip`, `side-panel-tab-*` (see
// twenty-front/src/modules/side-panel/tabs/).
test.describe.serial('Side panel tabs', () => {
  test('open two records as tabs, switch, close, reload → restored', async ({
    page,
  }) => {
    await page.goto('/objects/companies');

    const labels = await getRecordLabels(page);

    if (labels.length < 2) {
      throw new Error('Two company records needed for the side-panel tab flow');
    }

    // First record → promote to a tab.
    await getRecordLink(page, labels[0] ?? '').click();
    await expect(
      page.getByTestId('side-panel-open-in-tab-button'),
    ).toBeVisible();
    await page.getByTestId('side-panel-open-in-tab-button').click();
    await expect(page.getByTestId('side-panel-tab-strip')).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(1);
    const firstTabTitle = await page
      .getByRole('tab')
      .first()
      .getAttribute('aria-label');
    expect(firstTabTitle).toBeTruthy();

    // The open-in-tab click replaced the live stack, so go back to the table
    // and open a second record the same way.
    await page.goto('/objects/companies');
    const secondLabel = labels.find((label) => label !== firstTabTitle);

    if (secondLabel === undefined) {
      throw new Error('Second distinct company record not found for tab test');
    }

    await getRecordLink(page, secondLabel).click();
    await page.getByTestId('side-panel-open-in-tab-button').click();
    await expect(page.getByRole('tab')).toHaveCount(2);

    // Switch to the first tab and verify the record context follows.
    await page.getByRole('tab').first().click();
    await expect(page.getByRole('tab').first()).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Close the first tab; the panel should fall back to the neighbor tab.
    const firstTabId = await getTabId(page, 0);
    await page.getByTestId(`side-panel-tab-close-${firstTabId}`).click();
    await expect(page.getByRole('tab')).toHaveCount(1);

    // Reload: the surviving tab must be restored with its context.
    await page.reload();
    await expect(page.getByTestId('side-panel-tab-strip')).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(1);
    await expect(page.getByRole('tab').first()).toHaveAttribute(
      'aria-label',
      /.+/,
    );
  });
});

const getRecordLabels = async (page: Page): Promise<string[]> =>
  page.getByRole('grid').getByRole('link').allInnerTexts();

const getRecordLink = (page: Page, label: string) =>
  page.getByRole('grid').getByRole('link').filter({ hasText: label }).first();

const getTabId = async (page: Page, index: number): Promise<string> => {
  const id = await page.getByRole('tab').nth(index).getAttribute('id');

  if (id === null || !id.startsWith('side-panel-tab-')) {
    throw new Error(`No side panel tab found at index ${index}`);
  }

  return id.replace('side-panel-tab-', '');
};
