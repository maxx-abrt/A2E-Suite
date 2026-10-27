import { A2E_SUITE_IDENTITY } from './A2eSuiteIdentity';

export const A2E_SUITE_HELP_PAGES = {
  gettingStarted: {
    title: 'Getting started with A2E Suite',
    path: '/getting-started',
    content:
      'Create an account, choose a workspace starting point, install applications and import your notes.',
  },
  bureau: {
    title: 'Bureau',
    path: '/apps/bureau',
    content:
      'Write documents and nested pages, import Notion exports, organize projects, tasks and discussions.',
  },
  agenda: {
    title: 'Agenda',
    path: '/apps/agenda',
    content:
      'Plan calendar events, recurring events, reminders and task deadlines.',
  },
  bilan: {
    title: 'Bilan',
    path: '/apps/bilan',
    content:
      'Work with quotes, invoices, budgets, cash movements and financial documents when Bilan is installed.',
  },
  syna: {
    title: 'Syna',
    path: '/apps/syna',
    content:
      'Use the workspace AI assistant with configured providers and permissions. Review suggested changes.',
  },
  archive: {
    title: 'Archive',
    path: '/apps/archive',
    content:
      'Browse folders, upload files and preview attachments when Archive is installed.',
  },
  templates: {
    title: 'Workspace templates',
    path: '/getting-started',
    content:
      'Choose an individual, student, team, non-profit, small-business or CRM starting point.',
  },
  workingAcrossApps: {
    title: 'Working across applications',
    path: '/product',
    content:
      'Keep pages, projects, calendars, files and optional finance and CRM applications in one workspace.',
  },
  faqTroubleshooting: {
    title: 'Questions and troubleshooting',
    path: '/getting-started#questions',
    content: `Find answers about applications, workspaces, imports and permissions. Contact ${A2E_SUITE_IDENTITY.operator.email} for service support.`,
  },
} as const;
