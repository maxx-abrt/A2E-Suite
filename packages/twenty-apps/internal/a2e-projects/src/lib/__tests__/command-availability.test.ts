import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  COMMAND_MENU_ITEM_IDS,
  FRONT_COMPONENT_IDS,
} from '../../constants/universal-identifiers.ts';

import createProjectCommand from '../../command-menu-items/create-project.command-menu-item.ts';
import createTaskCommand from '../../command-menu-items/create-task.command-menu-item.ts';
import goToProjectsCommand from '../../command-menu-items/go-to-projects.command-menu-item.ts';
import openSubtasksCommand from '../../command-menu-items/open-subtasks.command-menu-item.ts';
import openTimeTrackerCommand from '../../command-menu-items/open-time-tracker.command-menu-item.ts';

// Cmd+K availability contract (P4.2). The manifest builder is the only other
// place these configs are read, so asserting them here catches a command that
// silently stops being registered or changes availability scope.
const COMMAND_REGISTRY = Object.values(COMMAND_MENU_ITEM_IDS) as string[];
const FRONT_COMPONENT_REGISTRY = Object.values(FRONT_COMPONENT_IDS) as string[];

const ALL_COMMANDS = [
  createProjectCommand,
  createTaskCommand,
  goToProjectsCommand,
  openSubtasksCommand,
  openTimeTrackerCommand,
];

test('every command config validates without errors', () => {
  for (const command of ALL_COMMANDS) {
    assert.equal(command.success, true);
    assert.deepEqual(command.errors, []);
  }
});

test('every command universal identifier is registered in COMMAND_MENU_ITEM_IDS', () => {
  for (const command of ALL_COMMANDS) {
    assert.ok(
      COMMAND_REGISTRY.includes(command.config.universalIdentifier),
      `${command.config.shortLabel} (${command.config.universalIdentifier}) is not in COMMAND_MENU_ITEM_IDS`,
    );
  }
});

test('every command points at a registered front component', () => {
  for (const command of ALL_COMMANDS) {
    assert.ok(
      FRONT_COMPONENT_REGISTRY.includes(
        command.config.frontComponentUniversalIdentifier,
      ),
      `${command.config.shortLabel} points at an unregistered front component`,
    );
  }
});

test('create task is globally available and wired to its front component', () => {
  const config = createTaskCommand.config;

  assert.equal(config.universalIdentifier, COMMAND_MENU_ITEM_IDS.createTask);
  assert.equal(config.availabilityType, 'GLOBAL');
  assert.equal(
    config.frontComponentUniversalIdentifier,
    FRONT_COMPONENT_IDS.createTaskCommand,
  );
  assert.ok(
    typeof config.shortLabel === 'string' && config.shortLabel.length > 0,
  );
});

test('go to project(s) and create project are globally available', () => {
  assert.equal(goToProjectsCommand.config.availabilityType, 'GLOBAL');
  assert.equal(
    goToProjectsCommand.config.universalIdentifier,
    COMMAND_MENU_ITEM_IDS.goToProjects,
  );
  assert.equal(createProjectCommand.config.availabilityType, 'GLOBAL');
});

test('the timer stays record-selection scoped while the subtask browser is global', () => {
  assert.equal(
    openTimeTrackerCommand.config.availabilityType,
    'RECORD_SELECTION',
  );
  assert.equal(openSubtasksCommand.config.availabilityType, 'GLOBAL');
});

test('command registry identifiers are unique and UUID-shaped', () => {
  assert.equal(
    new Set(COMMAND_REGISTRY).size,
    COMMAND_REGISTRY.length,
    'COMMAND_MENU_ITEM_IDS contains a duplicate identifier',
  );

  for (const identifier of COMMAND_REGISTRY) {
    assert.match(
      identifier,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  }
});
