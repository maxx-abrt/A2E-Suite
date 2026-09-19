// Universal identifiers for A2E Projects.
//
// One UUIDv4-class identifier per declarable thing, committed forever
// (additive-only law). The scheme is shaped like A2E Documents' but uses a
// distinct namespace so both apps install side by side (Documents owns
// c31a*, Projects owns c31b*):
// c31b{OO}00-{KK}00-4000-8000-0000000000{NN} where OO is the object index
// (OBJECT_INDEX below: 02 project, 03 milestone, 04 projectMember,
// 05 timeEntry, 06 label; 00 = app-level) and KK the family:
//   0000 object · 0001 own field · 0002 relation field · 0003 view ·
//   0004 view field · 0005 select option · 0006 view sort ·
//   0009 page-layout tab · 000a widget · 0010 nav item ·
//   0011 command menu item · 0012 logic function · 0013 front component
//
// Relation identifiers live here so object files never import each other
// (circular imports resolve to undefined at manifest build time).

export const OBJECT_IDS = {
  project: 'c31b0200-0000-4000-8000-000000000000',
  milestone: 'c31b0300-0000-4000-8000-000000000000',
  projectMember: 'c31b0400-0000-4000-8000-000000000000',
  timeEntry: 'c31b0500-0000-4000-8000-000000000000',
  label: 'c31b0600-0000-4000-8000-000000000000',
  taskLabel: 'c31b0700-0000-4000-8000-000000000000',
} as const;

// Objects this app does not own but pins an app-owned field on. The `document`
// object belongs to A2E Documents (`c31a…` namespace), which the install order
// (D-P4.3-DOC) requires before A2E Projects so `document.project` resolves.
export const EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS = {
  document: 'c31a0100-0000-4000-8000-000000000000',
} as const;

// Both sides of every relation, grouped by the record that owns the foreign key.
export const RELATION_IDS = {
  projectLead: 'c31b0200-0002-4000-8000-000000000001',
  memberProjects: 'c31b0200-0002-4000-8000-000000000002',
  projectCompany: 'c31b0200-0002-4000-8000-000000000003',
  companyProjects: 'c31b0200-0002-4000-8000-000000000004',
  // Cross-app relation to A2E Documents' `document` object (P4.3
  // D-P4.3-DOC): this app owns both sides; the FK (documentProject) lives on
  // the provider object, the inverse (projectDocuments) on our project object.
  projectDocuments: 'c31b0200-0002-4000-8000-000000000005',
  documentProject: 'c31b0200-0002-4000-8000-000000000006',
  projectMilestone: 'c31b0300-0002-4000-8000-000000000001',
  milestoneProjects: 'c31b0300-0002-4000-8000-000000000002',
  projectMemberProject: 'c31b0400-0002-4000-8000-000000000001',
  projectMembers: 'c31b0400-0002-4000-8000-000000000002',
  projectMemberWorkspaceMember: 'c31b0400-0002-4000-8000-000000000003',
  workspaceMemberProjectMemberships: 'c31b0400-0002-4000-8000-000000000004',
  timeEntryProject: 'c31b0500-0002-4000-8000-000000000001',
  projectTimeEntries: 'c31b0500-0002-4000-8000-000000000002',
  timeEntryTask: 'c31b0500-0002-4000-8000-000000000003',
  taskTimeEntries: 'c31b0500-0002-4000-8000-000000000004',
  timeEntryWorkspaceMember: 'c31b0500-0002-4000-8000-000000000005',
  workspaceMemberTimeEntries: 'c31b0500-0002-4000-8000-000000000006',
  taskLabelLabel: 'c31b0700-0002-4000-8000-000000000001',
  labelTaskLabels: 'c31b0700-0002-4000-8000-000000000002',
  labelsOnTask: 'c31b0700-0002-4000-8000-000000000004',
  subtasks: 'c31b0100-0002-4000-8000-000000000003',
  milestoneTasks: 'c31b0300-0002-4000-8000-000000000003',
} as const;

export const LABEL_IDENTIFIER_IDS = {
  projectName: 'c31b0200-0001-4000-8000-000000000001',
  milestoneName: 'c31b0300-0001-4000-8000-000000000001',
  projectMemberId: 'c31b0400-0001-4000-8000-000000000001',
  timeEntryLabel: 'c31b0500-0001-4000-8000-000000000001',
  labelName: 'c31b0600-0001-4000-8000-000000000001',
} as const;

export const LOGIC_FUNCTION_IDS = {
  postInstall: 'c31b0000-0012-4000-8000-000000000003',
  purgeTrash: 'c31b0000-0012-4000-8000-000000000005',
  taskHumanId: 'c31b0000-0012-4000-8000-000000000007',
  recurringTaskGenerator: 'c31b0000-0012-4000-8000-000000000009',
  retroplanning: 'c31b0000-0012-4000-8000-00000000000b',
  // AI tool seed (P4.3): inert « extract tasks from document » stub consumed
  // by the P9.2 document actions. Registered, never dispatched for writes.
  extractTasksFromDocument: 'c31b0000-0012-4000-8000-00000000000d',
} as const;

// Task-extension fields live on the standard task object (app fields,
// real-estate personType.field.ts pattern). `c31b0201` = family key issued
// from the A2E namespace block, next to the object family (`c31b0200`).
export const TASK_FIELD_IDS = {
  project: 'c31b0201-0001-4000-8000-000000000001',
  tasksOnProject: 'c31b0201-0002-4000-8000-000000000001',
  projectStatus: 'c31b0201-0001-4000-8000-000000000002',
  projectPriority: 'c31b0201-0001-4000-8000-000000000003',
  priority: 'c31b0201-0001-4000-8000-000000000003',
  estimate: 'c31b0201-0001-4000-8000-000000000004',
  blockIssue: 'c31b0201-0001-4000-8000-000000000005',
  blockedTasks: 'c31b0201-0002-4000-8000-000000000002',
  estimateLabel: 'c31b0201-0001-4000-8000-000000000006',
  milestone: 'c31b0201-0001-4000-8000-000000000007',
  parentTask: 'c31b0201-0001-4000-8000-000000000008',
  taskLabels: 'c31b0201-0002-4000-8000-000000000003',
  humanId: 'c31b0201-0001-4000-8000-000000000009',
  // Retroplanning provenance (P4.2): `<recipeKey>@v<version>:<taskKey>#<genDueAt>`.
  // Its own TEXT slot so replanning can tell an owned task from a manual one.
  retroplanningProvenance: 'c31b0201-0001-4000-8000-00000000000a',
} as const;

export const COMMAND_MENU_ITEM_IDS = {
  createProject: 'c31b0000-0011-4000-8000-000000000004',
  goToProjects: 'c31b0000-0011-4000-8000-000000000005',
  openSubtasks: 'c31b0000-0011-4000-8000-000000000006',
  openTimeTracker: 'c31b0000-0011-4000-8000-000000000007',
  createTask: 'c31b0000-0011-4000-8000-000000000008',
} as const;

export const NAVIGATION_MENU_ITEM_IDS = {
  projects: 'c31b0000-0010-4000-8000-000000000003',
  myTasks: 'c31b0000-0010-4000-8000-000000000005',
  myTasksAssigned: 'c31b0000-0010-4000-8000-000000000006',
  myTasksCreated: 'c31b0000-0010-4000-8000-000000000007',
  myTasksOverdue: 'c31b0000-0010-4000-8000-000000000008',
} as const;

export const FRONT_COMPONENT_IDS = {
  createProjectCommand: 'c31b0000-0013-4000-8000-000000000004',
  goToProjects: 'c31b0000-0013-4000-8000-000000000005',
  projectOverview: 'c31b0000-0013-4000-8000-000000000006',
  taskSubtasks: 'c31b0000-0013-4000-8000-000000000007',
  projectGantt: 'c31b0000-0013-4000-8000-000000000008',
  timeTracker: 'c31b0000-0013-4000-8000-000000000009',
  projectTimeRollup: 'c31b0000-0013-4000-8000-00000000000a',
  createTaskCommand: 'c31b0000-0013-4000-8000-00000000000b',
} as const;

export const VIEW_IDS = {
  allProjects: 'c31b0200-0003-4000-8000-000000000001',
  allMilestones: 'c31b0300-0003-4000-8000-000000000001',
  allLabels: 'c31b0600-0003-4000-8000-000000000001',
  taskBoard: 'c31b0100-0003-4000-8000-000000000001',
  taskCalendar: 'c31b0100-0003-4000-8000-000000000002',
  taskMyTasks: 'c31b0100-0003-4000-8000-000000000003',
  currentTasks: 'c31b0100-0003-4000-8000-000000000004',
  taskCreatedByMe: 'c31b0100-0003-4000-8000-000000000005',
  taskOverdue: 'c31b0100-0003-4000-8000-000000000006',
  // App view on the standard task object (c31b0201 family), referenced by the
  // project page Tâches tab.
  projectTasks: 'c31b0201-0003-4000-8000-000000000001',
} as const;

// View fields are positional, so their identifiers are derived. The middle
// segment is the object index; task-extension view fields use '01'.
export const viewFieldId = (
  objectIndex: string,
  viewIndex: number,
  position: number,
): string =>
  `c31b${objectIndex}00-0004-4000-8000-${viewIndex
    .toString(16)
    .padStart(2, '0')}${position.toString(16).padStart(10, '0')}`;

export const OBJECT_INDEX = {
  milestone: '03',
  project: '02',
  projectMember: '04',
  timeEntry: '05',
  label: '06',
  task: '01',
} as const;
