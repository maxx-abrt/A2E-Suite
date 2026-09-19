export type ContextToolButton = {
  toolName: string;
  label: string;
  description: string;
  applicationId: string;
  // App-declared tools (LOGIC_FUNCTION) are read-only by the P9 contract; the
  // mutating registry categories (ACTION, database writes) are never offered
  // here, so no button can write without an explicit user confirmation.
  readOnly: boolean;
  requiresConfirmation: boolean;
};
