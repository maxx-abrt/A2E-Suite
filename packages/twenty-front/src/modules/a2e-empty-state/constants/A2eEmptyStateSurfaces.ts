import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';
import { type AnimatedPlaceholderType } from 'twenty-ui/feedback';
import {
  type IconComponent,
  IconFolderPlus,
  IconPlus,
  IconUpload,
} from 'twenty-ui/icon';

import { type A2eHelpAppKey } from '@/a2e-help/constants/A2eHelpDocPages';

// The surfaces M13c covers, both halves (US-165 Bureau/Agenda, US-166
// Bilan/Archive). One entry per surface so the four required elements — one
// sentence, one primary action, one "Use a template" link and one "Learn more"
// link — are declared once and read by both the landing components and the
// record-index empty-state bridge.
export type A2eEmptyStateSurfaceKey =
  | 'bureau'
  | 'agenda'
  | 'documents'
  | 'tasks'
  | 'bilanInvoices'
  | 'bilanQuotes'
  | 'bilanBudgets'
  | 'bilanCategories'
  | 'archive'
  | 'archiveFolders';

// Which app owns the surface's object, so a missing app degrades to the host
// empty state instead of a broken panel. `null` means the surface is native and
// always available.
export type A2eEmptyStateRequiredApplication =
  | 'document'
  | 'accounting'
  | 'drive';

export type A2eEmptyStateSurface = {
  surfaceKey: A2eEmptyStateSurfaceKey;
  // Which app doc page the "Learn more" link (M12g `A2eLearnMoreLink`) opens.
  appKey: A2eHelpAppKey;
  // The M9 gallery category the "Use a template" link prefilters to.
  templateCategory: TemplateDescriptorCategory;
  // The single sentence the empty state shows.
  sentence: MessageDescriptor;
  animatedPlaceholderType: AnimatedPlaceholderType;
  // The primary create action's label and icon; the handler is supplied by the
  // surface so each keeps its own untouched write path.
  primaryActionLabel: MessageDescriptor;
  primaryActionIcon: IconComponent;
  // The record object this surface lists, or `null` for the app-home/explorer
  // surfaces that are their own page. The bridge matches on this so an invoice
  // index and a folder index get their contextual state without hard-coded files.
  objectNameSingular: string | null;
  // Install gate: a state for an app-owned object only renders when its app is
  // present, so a missing object never leaves a broken panel.
  requiredApplication: A2eEmptyStateRequiredApplication | null;
};

export const A2E_EMPTY_STATE_SURFACES: Record<
  A2eEmptyStateSurfaceKey,
  A2eEmptyStateSurface
> = {
  bureau: {
    surfaceKey: 'bureau',
    appKey: 'bureau',
    templateCategory: 'Pages',
    sentence: msg`Start your first page, or pick a template to shape it.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New page`,
    primaryActionIcon: IconPlus,
    objectNameSingular: null,
    requiredApplication: 'document',
  },
  agenda: {
    surfaceKey: 'agenda',
    appKey: 'agenda',
    templateCategory: 'Agenda',
    sentence: msg`Plan your first event, or start from a ready-made Agenda template.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New event`,
    primaryActionIcon: IconPlus,
    objectNameSingular: null,
    requiredApplication: null,
  },
  documents: {
    surfaceKey: 'documents',
    appKey: 'bureau',
    templateCategory: 'Pages',
    sentence: msg`Create your first page, or start from a template.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New page`,
    primaryActionIcon: IconPlus,
    objectNameSingular: 'document',
    requiredApplication: 'document',
  },
  tasks: {
    surfaceKey: 'tasks',
    appKey: 'agenda',
    templateCategory: 'Agenda',
    sentence: msg`Add your first task, or start from an Agenda template.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New task`,
    primaryActionIcon: IconPlus,
    objectNameSingular: 'task',
    requiredApplication: null,
  },
  bilanInvoices: {
    surfaceKey: 'bilanInvoices',
    appKey: 'bilan',
    templateCategory: 'Bilan',
    sentence: msg`Create your first invoice, or start from a Bilan template.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New invoice`,
    primaryActionIcon: IconPlus,
    objectNameSingular: 'invoice',
    requiredApplication: 'accounting',
  },
  bilanQuotes: {
    surfaceKey: 'bilanQuotes',
    appKey: 'bilan',
    templateCategory: 'Bilan',
    sentence: msg`Create your first quote, or start from a Bilan template.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New quote`,
    primaryActionIcon: IconPlus,
    objectNameSingular: 'quote',
    requiredApplication: 'accounting',
  },
  bilanBudgets: {
    surfaceKey: 'bilanBudgets',
    appKey: 'bilan',
    templateCategory: 'Bilan',
    sentence: msg`Set your first budget, or start from a Bilan template.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New budget`,
    primaryActionIcon: IconPlus,
    objectNameSingular: 'budget',
    requiredApplication: 'accounting',
  },
  bilanCategories: {
    surfaceKey: 'bilanCategories',
    appKey: 'bilan',
    templateCategory: 'Bilan',
    sentence: msg`Add your first category, or start from a Bilan template.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New category`,
    primaryActionIcon: IconPlus,
    objectNameSingular: 'financeCategory',
    requiredApplication: 'accounting',
  },
  archive: {
    surfaceKey: 'archive',
    appKey: 'archive',
    templateCategory: 'Archive',
    sentence: msg`Upload your first file, or start from a folder structure.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`Upload a file`,
    primaryActionIcon: IconUpload,
    objectNameSingular: null,
    requiredApplication: 'drive',
  },
  archiveFolders: {
    surfaceKey: 'archiveFolders',
    appKey: 'archive',
    templateCategory: 'Archive',
    sentence: msg`Create your first folder, or start from a folder structure.`,
    animatedPlaceholderType: 'noRecord',
    primaryActionLabel: msg`New folder`,
    primaryActionIcon: IconFolderPlus,
    objectNameSingular: 'driveFolder',
    requiredApplication: 'drive',
  },
};
