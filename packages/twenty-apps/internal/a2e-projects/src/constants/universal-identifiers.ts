// Universal identifiers for A2E Projects.
//
// One UUIDv4-class identifier per declarable thing, committed forever
// (additive-only law). The namespace mirrors A2E Documents' scheme:
// c31a{OO}00-{KK}00-4000-8000-0000000000{NN} where OO is the object index
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
  project: 'c31a0200-0000-4000-8000-000000000000',
  milestone: 'c31a0300-0000-4000-8000-000000000000',
  projectMember: 'c31a0400-0000-4000-8000-000000000000',
  timeEntry: 'c31a0500-0000-4000-8000-000000000000',
  label: 'c31a0600-0000-4000-8000-000000000000',
  taskLabel: 'c31a0700-0000-4000-8000-000000000000',
} as const;

// Both sides of every relation, grouped by the record that owns the foreign key.
export const RELATION_IDS = {
  projectLead: 'c31a0200-0002-4000-8000-000000000001',
  memberProjects: 'c31a0200-0002-4000-8000-000000000002',
  projectCompany: 'c31a0200-0002-4000-8000-000000000003',
  companyProjects: 'c31a0200-0002-4000-8000-000000000004',
  projectMilestone: 'c31a0300-0002-4000-8000-000000000001',
  milestoneProjects: 'c31a0300-0002-4000-8000-000000000002',
  projectMemberProject: 'c31a0400-0002-4000-8000-000000000001',
  projectMembers: 'c31a0400-0002-4000-8000-000000000002',
  projectMemberWorkspaceMember: 'c31a0400-0002-4000-8000-000000000003',
  workspaceMemberProjectMemberships: 'c31a0400-0002-4000-8000-000000000004',
  timeEntryProject: 'c31a0500-0002-4000-8000-000000000001',
  projectTimeEntries: 'c31a0500-0002-4000-8000-000000000002',
  timeEntryTask: 'c31a0500-0002-4000-8000-000000000003',
  taskTimeEntries: 'c31a0500-0002-4000-8000-000000000004',
  timeEntryWorkspaceMember: 'c31a0500-0002-4000-8000-000000000005',
  workspaceMemberTimeEntries: 'c31a0500-0002-4000-8000-000000000006',
  taskLabelLabel: 'c31a0700-0002-4000-8000-000000000001',
  labelTaskLabels: 'c31a0700-0002-4000-8000-000000000002',
  labelsOnTask: 'c31a0700-0002-4000-8000-000000000004',
  subtasks: 'c31a0100-0002-4000-8000-000000000003',
  milestoneTasks: 'c31a0300-0002-4000-8000-000000000003',
} as const;

export const LABEL_IDENTIFIER_IDS = {
  projectName: 'c31a0200-0001-4000-8000-000000000001',
  milestoneName: 'c31a0300-0001-4000-8000-000000000001',
  projectMemberId: 'c31a0400-0001-4000-8000-000000000001',
  timeEntryLabel: 'c31a0500-0001-4000-8000-000000000001',
  labelName: 'c31a0600-0001-4000-8000-000000000001',
} as const;

export const LOGIC_FUNCTION_IDS = {
  postInstall: 'c31a0000-0012-4000-8000-000000000003',
  purgeTrash: 'c31a0000-0012-4000-8000-000000000005',
  taskHumanId: 'c31a0000-0012-4000-8000-000000000007',
} as const;

// Task-extension fields live on the standard task object (app fields,
// real-estate personType.field.ts pattern). `c31a0201` = family key issued
// from the A2E namespace block, next to the object family (`c31a0200`).
export const TASK_FIELD_IDS = {
  project: 'c31a0201-0001-4000-8000-000000000001',
  tasksOnProject: 'c31a0201-0002-4000-8000-000000000001',
  projectStatus: 'c31a0201-0001-4000-8000-000000000002',
  projectPriority: 'c31a0201-0001-4000-8000-000000000003',
  priority: 'c31a0201-0001-4000-8000-000000000003',
  estimate: 'c31a0201-0001-4000-8000-000000000004',
  blockIssue: 'c31a0201-0001-4000-8000-000000000005',
  blockedTasks: 'c31a0201-0002-4000-8000-000000000002',
  estimateLabel: 'c31a0201-0001-4000-8000-000000000006',
  milestone: 'c31a0201-0001-4000-8000-000000000007',
  parentTask: 'c31a0201-0001-4000-8000-000000000008',
  taskLabels: 'c31a0201-0002-4000-8000-000000000003',
  humanId: 'c31a0201-0001-4000-8000-000000000009',
} as const;

export const COMMAND_MENU_ITEM_IDS = {
  createProject: 'c31a0000-0011-4000-8000-000000000004',
  goToProjects: 'c31a0000-0011-4000-8000-000000000005',
} as const;

export const NAVIGATION_MENU_ITEM_IDS = {
  projects: 'c31a0000-0010-4000-8000-000000000003',
  myTasks: 'c31a0000-0010-4000-8000-000000000005',
} as const;

export const FRONT_COMPONENT_IDS = {
  createProjectCommand: 'c31a0000-0013-4000-8000-000000000004',
  goToProjects: 'c31a0000-0013-4000-8000-000000000005',
} as const;

export const VIEW_IDS = {
  allProjects: 'c31a0200-0003-4000-8000-000000000001',
  allMilestones: 'c31a0300-0003-4000-8000-000000000001',
  allLabels: 'c31a0600-0003-4000-8000-000000000001',
  taskBoard: 'c31a0100-0003-4000-8000-000000000001',
  taskCalendar: 'c31a0100-0003-4000-8000-000000000002',
  taskMyTasks: 'c31a0100-0003-4000-8000-000000000003',
  currentTasks: 'c31a0100-0003-4000-8000-000000000004',
} as const;

// View fields are positional, so their identifiers are derived. The middle
// segment is the object index; task-extension view fields use '01'.
export const viewFieldId = (
  objectIndex: string,
  viewIndex: number,
  position: number,
): string =>
  `c31a${objectIndex}00-0004-4000-8000-${viewIndex
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
