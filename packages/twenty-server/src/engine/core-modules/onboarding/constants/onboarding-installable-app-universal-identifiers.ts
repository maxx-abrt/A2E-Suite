// Apps the onboarding "install apps" step may install. The step drops any
// selected identifier that is not listed here, so this list must stay equal to
// the front's ONBOARDING_INSTALLABLE_APPS (guarded by the parity spec in
// __tests__). Identifiers mirror each app's committed application.config.ts.
export const ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS = [
  // a2e-documents (Bureau)
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
  // a2e-projects
  '4f759655-84f8-434d-9c76-ee1850e8c1a4',
  // a2e-accounting (Bilan)
  'b11a0000-0000-4000-8000-000000000001',
  // a2e-chat
  'e2dce399-87f1-4548-b307-5f368b4d5dd4',
  // a2e-drive
  'b11cd01f-75de-4acd-8e67-0e9c484fde02',
  // a2e-crm (CRM assistant)
  'c31e0000-0000-4000-8000-000000000000',
  // Call recorder
  '8da4b8b5-5edf-4880-b51f-ab6e679ec617',
  // Enrichment (People Data Labs)
  '4a1178c1-3535-4a47-b592-231d3216b36f',
  // Last contact
  '66a504cc-0a75-410e-a43f-cdeae1db1522',
];
