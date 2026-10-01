import { type CrossAppEventAction } from '@/cross-app-events/cross-app-event-action.type';
import { type CrossAppEventObjectFamily } from '@/cross-app-events/cross-app-event-object-family.type';

// Bump when the payload shape changes in a breaking way; consumers can then
// reject or migrate rather than silently misreading an event.
export const CROSS_APP_EVENT_CONTRACT_VERSION = 1;

export const CROSS_APP_EVENT_OBJECT_FAMILIES: readonly CrossAppEventObjectFamily[] =
  ['document', 'task', 'calendarEvent', 'file', 'invoice'];

export const CROSS_APP_EVENT_ACTIONS: readonly CrossAppEventAction[] = [
  'created',
  'updated',
  'completed',
  'deleted',
];

// Family -> workspace object singular name. `file` rides the standard
// `attachment` object, which is the single storage for uploaded files.
export const CROSS_APP_EVENT_OBJECT_NAME_BY_FAMILY: Record<
  CrossAppEventObjectFamily,
  string
> = {
  document: 'document',
  task: 'task',
  calendarEvent: 'calendarEvent',
  file: 'attachment',
  invoice: 'invoice',
};

// Family -> universal identifier of the app that must be installed for its
// objects to exist. Standard families (task, calendarEvent, file/attachment)
// are ungated; document and invoice belong to optional apps, so their events
// are only emitted once the app is installed.
export const CROSS_APP_EVENT_ACTIVATION_APP_BY_FAMILY: Partial<
  Record<CrossAppEventObjectFamily, string>
> = {
  document: '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
  invoice: 'b11a0000-0000-4000-8000-000000000001',
};
