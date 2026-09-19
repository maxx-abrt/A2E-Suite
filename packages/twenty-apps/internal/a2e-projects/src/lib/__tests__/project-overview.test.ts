import assert from 'node:assert/strict';
import { test } from 'node:test';

import { projectHealthOptions } from '../../constants/field-vocabulary.ts';
import {
  buildProjectOverviewSummary,
  formatProjectHealthLabel,
  formatWorkspaceMemberName,
  PROJECT_HEALTH_LABELS,
  PROJECT_HEALTH_UNKNOWN_LABEL,
  PROJECT_MEMBER_UNKNOWN_LABEL,
} from '../project-overview.ts';

test('the health labels stay in sync with the project health field options', () => {
  const optionsByValue = new Map(
    projectHealthOptions.map((option) => [option.value, option.label]),
  );

  assert.deepEqual(
    Object.keys(PROJECT_HEALTH_LABELS).sort(),
    [...optionsByValue.keys()].sort(),
  );

  for (const [value, label] of Object.entries(PROJECT_HEALTH_LABELS)) {
    assert.equal(optionsByValue.get(value), label);
  }
});

test('an unknown or missing health falls back to the explicit unknown label', () => {
  assert.equal(formatProjectHealthLabel('ON_TRACK'), 'Dans les temps');
  assert.equal(formatProjectHealthLabel('AT_RISK'), 'À risque');
  assert.equal(formatProjectHealthLabel('OFF_TRACK'), 'En difficulté');
  assert.equal(formatProjectHealthLabel(null), PROJECT_HEALTH_UNKNOWN_LABEL);
  assert.equal(
    formatProjectHealthLabel('NOT_A_HEALTH_VALUE'),
    PROJECT_HEALTH_UNKNOWN_LABEL,
  );
});

test('member names join the non-empty name parts and fall back when empty', () => {
  assert.equal(
    formatWorkspaceMemberName({ firstName: 'Ada', lastName: 'Lovelace' }),
    'Ada Lovelace',
  );
  assert.equal(
    formatWorkspaceMemberName({ firstName: 'Ada', lastName: null }),
    'Ada',
  );
  assert.equal(
    formatWorkspaceMemberName({ firstName: null, lastName: 'Lovelace' }),
    'Lovelace',
  );
  assert.equal(formatWorkspaceMemberName(null), PROJECT_MEMBER_UNKNOWN_LABEL);
  assert.equal(
    formatWorkspaceMemberName({ firstName: '', lastName: '' }),
    PROJECT_MEMBER_UNKNOWN_LABEL,
  );
});

test('the overview summary counts members and keeps the native signals', () => {
  const summary = buildProjectOverviewSummary({
    health: 'AT_RISK',
    taskCount: 7,
    milestoneCount: 3,
    activityCount: 12,
    documentCount: 5,
    members: [
      { membershipId: 'm1', role: 'LEAD', displayName: 'Ada Lovelace' },
      { membershipId: 'm2', role: 'MEMBER', displayName: 'Alan Turing' },
    ],
  });

  assert.deepEqual(summary, {
    healthLabel: 'À risque',
    taskCount: 7,
    milestoneCount: 3,
    activityCount: 12,
    documentCount: 5,
    memberCount: 2,
    members: [
      { membershipId: 'm1', role: 'LEAD', displayName: 'Ada Lovelace' },
      { membershipId: 'm2', role: 'MEMBER', displayName: 'Alan Turing' },
    ],
  });
});
