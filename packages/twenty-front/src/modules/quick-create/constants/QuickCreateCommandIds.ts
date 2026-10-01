// Stable ids for the Cmd+K "Create…" entries. A `QuickCreateCommandId` doubles
// as the command-menu selectable item id (the existing host-command pattern, as
// in `NEW_PAGE_COMMAND_ID`) and as the input-builder discriminator.
export const QUICK_CREATE_COMMAND_IDS = {
  page: 'quick-create-page',
  task: 'quick-create-task',
  project: 'quick-create-project',
  event: 'quick-create-event',
  invoice: 'quick-create-invoice',
  expense: 'quick-create-expense',
  fileUpload: 'quick-create-file-upload',
} as const;

export type QuickCreateCommandId =
  (typeof QUICK_CREATE_COMMAND_IDS)[keyof typeof QUICK_CREATE_COMMAND_IDS];
