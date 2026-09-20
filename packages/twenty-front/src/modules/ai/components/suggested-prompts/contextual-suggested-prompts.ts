import { msg } from '@lingui/core/macro';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import {
  IconCheckbox,
  IconCopy,
  IconFiles,
  IconFilter,
  IconLanguage,
  IconListCheck,
  IconMail,
  IconMessage,
  IconNotes,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTerminal,
  IconWand,
} from 'twenty-ui/icon';

import { type SuggestedPrompt } from '@/ai/types/SuggestedPrompt';

export const LIST_VIEW_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'summarize-view',
    label: msg`Summarize this view`,
    Icon: IconSparkles,
    mode: 'SEND',
    prompts: [
      msg`Summarize the records in this view and point out anything that needs attention.`,
    ],
  },
  {
    id: 'filter-view',
    label: msg`Filter this view`,
    Icon: IconFilter,
    prompts: [msg`Filter this view to only show `],
  },
  {
    id: 'create-record-in-view',
    label: msg`Create a record`,
    Icon: IconPlus,
    prompts: [msg`Create a new record in this view. Details: `],
  },
];

export const CHAT_CHANNEL_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'summarize-channel',
    label: msg`Summarize this channel`,
    Icon: IconSparkles,
    mode: 'SEND',
    prompts: [msg`Summarize the recent messages in this channel.`],
  },
  {
    id: 'catch-up-on-channel',
    label: msg`Catch me up`,
    Icon: IconMessage,
    mode: 'SEND',
    prompts: [msg`Catch me up on what I missed in this channel.`],
  },
];

export const RECORD_PAGE_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'summarize-record',
    label: msg`Summarize this record`,
    Icon: IconSparkles,
    mode: 'SEND',
    prompts: [msg`Summarize this record and its recent activity.`],
  },
  {
    id: 'add-note-to-record',
    label: msg`Add a note`,
    Icon: IconNotes,
    prompts: [msg`Add a note to this record: `],
  },
  {
    id: 'create-task-for-record',
    label: msg`Create a task`,
    Icon: IconCheckbox,
    prompts: [msg`Create a task for this record: `],
  },
];

// Only objects whose record page deserves its own wording need an entry: everything
// else, custom objects included, falls back to RECORD_PAGE_SUGGESTED_PROMPTS.
export const RECORD_PAGE_SUGGESTED_PROMPTS_BY_OBJECT_NAME_SINGULAR: Record<
  string,
  SuggestedPrompt[]
> = {
  [CoreObjectNameSingular.Workflow]: [
    {
      id: 'explain-workflow',
      label: msg`Explain this workflow`,
      Icon: IconSparkles,
      mode: 'SEND',
      prompts: [msg`Explain what this workflow does, step by step.`],
    },
    {
      id: 'add-workflow-step',
      label: msg`Add a step`,
      Icon: IconPlus,
      prompts: [msg`Add a step to this workflow that `],
    },
    {
      id: 'check-workflow-runs',
      label: msg`Check recent runs`,
      Icon: IconTerminal,
      mode: 'SEND',
      prompts: [
        msg`Check this workflow's recent runs and tell me whether any failed and why.`,
      ],
    },
  ],
  [CoreObjectNameSingular.Company]: [
    {
      id: 'research-company',
      label: msg`Research this company`,
      Icon: IconSearch,
      mode: 'SEND',
      prompts: [
        msg`Research this company and summarize what they do, how big they are and any recent news.`,
      ],
    },
    {
      id: 'draft-company-email',
      label: msg`Draft an email`,
      Icon: IconMail,
      prompts: [msg`Draft an email to this company about `],
    },
    {
      id: 'create-task-for-company',
      label: msg`Create a task`,
      Icon: IconCheckbox,
      prompts: [msg`Create a task for this company: `],
    },
  ],
  // App-owned record pages: the per-app P9.2 read-only actions get wording that
  // names the action, so the empty state matches the context tool buttons.
  document: [
    {
      id: 'summarize-document',
      label: msg`Summarize this document`,
      Icon: IconSparkles,
      mode: 'SEND',
      prompts: [msg`Summarize this document.`],
    },
    {
      id: 'extract-tasks-from-document',
      label: msg`Extract tasks`,
      Icon: IconListCheck,
      prompts: [msg`Extract the action items from this document as tasks.`],
    },
    {
      id: 'translate-document',
      label: msg`Translate this document`,
      Icon: IconLanguage,
      prompts: [msg`Translate this document into `],
    },
    {
      id: 'improve-document-writing',
      label: msg`Improve the writing`,
      Icon: IconWand,
      prompts: [msg`Improve the writing of this document: `],
    },
  ],
  project: [
    {
      id: 'standup-digest',
      label: msg`Standup digest`,
      Icon: IconSparkles,
      mode: 'SEND',
      prompts: [msg`Give me the standup digest for this project.`],
    },
    {
      id: 'task-breakdown-context',
      label: msg`Suggest a task breakdown`,
      Icon: IconListCheck,
      prompts: [msg`Suggest a task breakdown for this project: `],
    },
  ],
  driveFolder: [
    {
      id: 'find-file',
      label: msg`Find a file`,
      Icon: IconSearch,
      prompts: [msg`Find the file in this folder that `],
    },
    {
      id: 'dedupe-hints',
      label: msg`Find duplicates`,
      Icon: IconCopy,
      mode: 'SEND',
      prompts: [msg`Find likely duplicate files in this folder.`],
    },
  ],
  [CoreObjectNameSingular.Person]: [
    {
      id: 'assist-record-enrichment',
      label: msg`Enrich this person`,
      Icon: IconFiles,
      mode: 'SEND',
      prompts: [
        msg`Tell me which identity fields are missing on this person so I can enrich the record.`,
      ],
    },
  ],
  [CoreObjectNameSingular.MessageThread]: [
    {
      id: 'draft-email-reply',
      label: msg`Draft a reply`,
      Icon: IconMail,
      prompts: [msg`Draft a reply to this email thread: `],
    },
  ],
};
