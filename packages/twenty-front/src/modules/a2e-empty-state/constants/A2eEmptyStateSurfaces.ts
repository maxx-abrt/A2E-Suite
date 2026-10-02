import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';
import { type AnimatedPlaceholderType } from 'twenty-ui/feedback';
import { type IconComponent, IconPlus } from 'twenty-ui/icon';

import { type A2eHelpAppKey } from '@/a2e-help/constants/A2eHelpDocPages';

// The surfaces M13c covers in the Bureau + Agenda half (US-165). One entry per
// surface so the four required elements — one sentence, one primary action, one
// "Use a template" link and one "Learn more" link — are declared once and read
// by both the landing components and the record-index empty-state bridge.
export type A2eEmptyStateSurfaceKey =
  | 'bureau'
  | 'agenda'
  | 'documents'
  | 'tasks';

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
  // The record object this surface lists, or `null` for the two app-home
  // landings that are their own page. The bridge matches on this so a document
  // index and a task index get their contextual state without hard-coded files.
  objectNameSingular: string | null;
  // Install gate: a state for the app-owned `document` object only renders when
  // a2e-documents is present, so a missing object never leaves a broken panel.
  requiresDocumentApplication: boolean;
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
    requiresDocumentApplication: true,
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
    requiresDocumentApplication: false,
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
    requiresDocumentApplication: true,
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
    requiresDocumentApplication: false,
  },
};
