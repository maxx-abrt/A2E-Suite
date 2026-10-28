import {
  IconAgenda,
  IconArchive,
  IconBilan,
  IconBureau,
  IconSyna,
} from '@/a2e-workspace/components/A2eAppLogo';
import { A2E_BRAND_ASCII_LOGOS } from '@/a2e-workspace/constants/A2eBrandAsciiLogos';
import { msg } from '@lingui/core/macro';
import { IconUsers } from 'twenty-ui/icon';

export const PUBLIC_SITE_APPLICATIONS = [
  {
    id: 'bureau',
    illustration: A2E_BRAND_ASCII_LOGOS.bureau,
    name: msg`Bureau`,
    Icon: IconBureau,
    heading: msg`A home for every idea.`,
    body: msg`Write rich pages, organize nested notes and keep project knowledge close. Bureau brings Pages, Projects and Discussions into the same workspace.`,
    details: [
      msg`Rich text, tables, checklists and files`,
      msg`Nested pages, favorites and reusable templates`,
      msg`Preview and import Notion exports`,
    ],
    availability: msg`Bureau Pages, Projects and Discussions are included in the personal, student and team starting points.`,
    workflow: msg`Start on the Bureau home, open a recent page or create a new one. Organize its subpages, use a saved template, or open Projects and Discussions from the workspace navigation.`,
    tone: 'blue',
  },
  {
    id: 'agenda',
    illustration: A2E_BRAND_ASCII_LOGOS.agenda,
    name: msg`Agenda`,
    Icon: IconAgenda,
    heading: msg`Find a little more time.`,
    body: msg`See events and task deadlines together. Plan the week with a calendar that belongs to your workspace.`,
    details: [
      msg`Calendar views and recurring events`,
      msg`Reminders and task deadlines`,
      msg`Your plans beside your knowledge`,
    ],
    availability: msg`The calendar is part of the workspace. Navigation and connected calendars depend on your setup.`,
    workflow: msg`Open Agenda to see your week. Create an event, choose its date and recurrence, and set a reminder. Task deadlines appear alongside your planning.`,
    tone: 'purple',
  },
  {
    id: 'bilan',
    illustration: A2E_BRAND_ASCII_LOGOS.bilan,
    name: msg`Bilan`,
    Icon: IconBilan,
    heading: msg`Give your numbers a place.`,
    body: msg`An optional finance application for quotes, invoices, budgets and financial documents, in the same workspace.`,
    details: [
      msg`Quotes and invoice drafts`,
      msg`Budgets and cash movements`,
      msg`Available when installed by your administrator`,
    ],
    availability: msg`Bilan is included in non-profit and small-business starting points, subject to application availability.`,
    workflow: msg`Start with a quote or invoice draft, organize your financial documents and review budgets and cash movements. Available screens depend on the installed Bilan application.`,
    tone: 'amber',
  },
  {
    id: 'archive',
    illustration: A2E_BRAND_ASCII_LOGOS.archive,
    name: msg`Archive`,
    Icon: IconArchive,
    heading: msg`Keep the useful things close.`,
    body: msg`Organize files in folders, find the right document and preview it without losing your place.`,
    details: [
      msg`Folders and workspace files`,
      msg`Previews and attachments`,
      msg`Storage usage at a glance`,
    ],
    availability: msg`Archive is available when the file management application is installed.`,
    workflow: msg`Open Archive, create a folder and upload your files. Browse the folder tree, preview supported files and check storage usage from the same place.`,
    tone: 'green',
  },
  {
    id: 'crm',
    illustration: undefined,
    name: msg`CRM`,
    Icon: IconUsers,
    heading: msg`Remember the people behind the work.`,
    body: msg`Enable contacts, companies and opportunities when you need client management. Choose the views that fit your team.`,
    details: [
      msg`Contacts, companies and opportunities`,
      msg`Table and pipeline views`,
      msg`Optional navigation for client work`,
    ],
    availability: msg`Choose the CRM starting point or enable CRM navigation when client work becomes part of your day.`,
    workflow: msg`Keep people and companies in table views, then follow opportunities through a pipeline. Open a record to find its related activities and tasks.`,
    tone: 'orange',
  },
  {
    id: 'syna',
    illustration: A2E_BRAND_ASCII_LOGOS.syna,
    name: msg`Syna`,
    Icon: IconSyna,
    heading: msg`A helping hand, in context.`,
    body: msg`Ask your workspace assistant for help with ideas and everyday work. Availability depends on the AI providers configured for your instance.`,
    details: [
      msg`AI chat in your workspace`,
      msg`Configurable model providers`,
      msg`Review suggestions before applying changes`,
    ],
    availability: msg`An AI provider and appropriate workspace permissions are required.`,
    workflow: msg`Open Syna, choose an available model and ask for help. Use its answers as a starting point, and review any suggested changes to your work.`,
    tone: 'pink',
  },
] as const;

export const PUBLIC_SITE_FAQ = [
  {
    question: msg`What is A2E Suite?`,
    answer: msg`A modular workspace for knowledge, projects, calendars, files and client work, with optional finance and AI applications. Start with the tools that fit your work and add more when you need them.`,
  },
  {
    question: msg`Can I bring my Notion pages?`,
    answer: msg`Yes. In Bureau, choose Import, select Notion and drop an HTML or Markdown & CSV export ZIP. Preview the pages and hierarchy, then choose a destination. Include subpages and files in the export; HTML preserves more formatting. Permissions, comments, database formulas and Notion view settings are not recreated.`,
  },
  {
    question: msg`Do I need every application?`,
    answer: msg`No. Choose a starting workspace template or begin from scratch. Applications depend on what your administrator has made available and installed. CRM navigation is optional.`,
  },
  {
    question: msg`Can I work in more than one workspace?`,
    answer: msg`Yes. An account can belong to several workspaces. Switch between them from the workspace menu; membership and permissions apply separately in each workspace.`,
  },
  {
    question: msg`Is my workspace public?`,
    answer: msg`Your workspace requires an account and the appropriate access permissions. Sharing a document is a separate, explicit action. Invite only the people who need access and choose their role.`,
  },
  {
    question: msg`How do I get started?`,
    answer: msg`Use Get started to open the account page. Sign in or create an account, then create or join a workspace. Your instance administrator manages application availability and hosting.`,
  },
] as const;
