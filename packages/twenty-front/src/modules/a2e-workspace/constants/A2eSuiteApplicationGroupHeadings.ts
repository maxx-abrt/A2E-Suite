// Cmd+K groups app-provider results under the installed application name,
// which for a2e-projects is its own display name "Bureau Projets". Tasks and
// projects belong to the Bureau suite, so their Cmd+K group must read under
// the suite brand instead. Keyed by universal identifier on purpose: the app's
// package and path constants never change.
export const A2E_SUITE_APPLICATION_GROUP_HEADINGS: Record<string, string> = {
  // a2e-projects
  '4f759655-84f8-434d-9c76-ee1850e8c1a4': 'Bureau',
};
