import { type ComponentType } from 'react';
import {
  IconCheckbox,
  IconInbox,
  IconMessageCircle,
  IconSparkles,
  IconTimelineEvent,
  IconUsers,
  type IconComponent,
} from 'twenty-ui/icon';

export type WorkbenchWidgetId =
  | 'inbox'
  | 'assistant'
  | 'comments'
  | 'tasks'
  | 'activity'
  | 'presence';

export type WorkbenchWidgetDefinition = {
  id: WorkbenchWidgetId | (string & {});
  Icon: IconComponent;
  Component?: ComponentType;
  order?: number;
};

const definitionsById = new Map<string, WorkbenchWidgetDefinition>();
const listeners = new Set<() => void>();
let snapshot: WorkbenchWidgetDefinition[] = [];

const refreshSnapshot = () => {
  snapshot = [...definitionsById.values()].sort(
    (firstDefinition, secondDefinition) =>
      (firstDefinition.order ?? 100) - (secondDefinition.order ?? 100),
  );
  listeners.forEach((listener) => listener());
};

export const registerWorkbenchWidget = (
  definition: WorkbenchWidgetDefinition,
): (() => void) => {
  definitionsById.set(definition.id, definition);
  refreshSnapshot();

  return () => {
    definitionsById.delete(definition.id);
    refreshSnapshot();
  };
};

export const getWorkbenchWidgetRegistrySnapshot = () => snapshot;

export const subscribeToWorkbenchWidgetRegistry = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

const DEFAULT_WIDGETS: WorkbenchWidgetDefinition[] = [
  { id: 'inbox', Icon: IconInbox, order: 10 },
  { id: 'assistant', Icon: IconSparkles, order: 20 },
  { id: 'comments', Icon: IconMessageCircle, order: 30 },
  { id: 'tasks', Icon: IconCheckbox, order: 40 },
  { id: 'activity', Icon: IconTimelineEvent, order: 50 },
  { id: 'presence', Icon: IconUsers, order: 60 },
];

DEFAULT_WIDGETS.forEach((definition) => {
  definitionsById.set(definition.id, definition);
});
refreshSnapshot();
