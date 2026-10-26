import { type CurrentWorkspaceMember } from '@/auth/states/currentWorkspaceMemberState';
import { buildBureauTaskFocusView } from '@/bureau/utils/buildBureauTaskFocusView';
import { type BureauTaskScope } from '@/bureau/types/BureauTaskScope';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isRecordMatchingFilter } from '@/object-record/record-filter/utils/isRecordMatchingFilter';
import { buildRecordInputFromFilter } from '@/object-record/record-table/utils/buildRecordInputFromFilter';
import { type View } from '@/views/types/View';
import { mapViewFiltersToFilters } from '@/views/utils/mapViewFiltersToFilters';
import { mapViewFilterGroupsToRecordFilterGroups } from '@/views/utils/mapViewFilterGroupsToRecordFilterGroups';
import { Temporal } from 'temporal-polyfill';
import { FieldMetadataType } from 'twenty-shared/types';
import { computeRecordGqlOperationFilter } from 'twenty-shared/utils';
import { RelationType } from '~/generated-metadata/graphql';

const MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const fields = [
  {
    id: 'assignee',
    name: 'assignee',
    label: 'Assignee',
    type: FieldMetadataType.RELATION,
    relation: { type: RelationType.MANY_TO_ONE, joinColumnName: 'assigneeId' },
  },
  {
    id: 'dueAt',
    name: 'dueAt',
    label: 'Due date',
    type: FieldMetadataType.DATE_TIME,
  },
  {
    id: 'status',
    name: 'status',
    label: 'Status',
    type: FieldMetadataType.SELECT,
  },
  {
    id: 'projectStatus',
    name: 'projectStatus',
    label: 'Project status',
    type: FieldMetadataType.SELECT,
  },
] as FieldMetadataItem[];
const objectMetadataItem = {
  nameSingular: 'task',
  fields,
} as EnrichedObjectMetadataItem;
const view = {
  id: 'task-view',
  viewFields: [],
  viewFilters: [],
  viewFilterGroups: [],
  viewSorts: [],
} as unknown as View;
const today = Temporal.ZonedDateTime.from(
  '2026-10-25T00:00:00+02:00[Europe/Paris]',
);
const focus = (
  scope: BureauTaskScope,
  showCompleted = false,
  readableFields = fields,
) =>
  buildBureauTaskFocusView({
    view,
    scope,
    today,
    showCompleted,
    readableFields,
    workspaceMemberId: MEMBER_ID,
  });
const filtersFor = (selectedView: View) =>
  mapViewFiltersToFilters(selectedView.viewFilters, fields);
const matches = (selectedView: View, record: Record<string, unknown>) =>
  isRecordMatchingFilter({
    record: {
      deletedAt: null,
      assigneeId: MEMBER_ID,
      status: 'TODO',
      projectStatus: null,
      dueAt: '2026-10-25T12:00:00Z',
      ...record,
    },
    filter: computeRecordGqlOperationFilter({
      fieldMetadataItems: fields,
      recordFilters: filtersFor(selectedView),
      recordFilterGroups: mapViewFilterGroupsToRecordFilterGroups(
        selectedView.viewFilterGroups ?? [],
      ),
      filterValueDependencies: {
        timeZone: 'Europe/Paris',
        currentWorkspaceMemberId: MEMBER_ID,
      },
    }),
    objectMetadataItem,
    objectMetadataItems: [objectMetadataItem],
  });

describe('Bureau task focus through native filters and creation defaults', () => {
  it('restricts personal work to the current member and includes unplanned tasks', () => {
    expect(matches(focus('mine'), { dueAt: null })).toBe(true);
    expect(matches(focus('mine'), { assigneeId: null })).toBe(false);
    expect(matches(focus('all'), { assigneeId: null })).toBe(true);
  });

  it.each([
    ['2026-10-24T21:59:59Z', false],
    ['2026-10-24T22:00:00Z', true],
    ['2026-10-25T22:59:59Z', true],
    ['2026-10-25T23:00:00Z', false],
    [null, false],
  ])('uses the whole local day across DST for %s', (dueAt, expected) => {
    expect(matches(focus('today'), { dueAt })).toBe(expected);
  });

  it.each([
    ['2026-10-25T22:59:59Z', false],
    ['2026-10-25T23:00:00Z', true],
    ['2026-11-01T22:59:59Z', true],
    ['2026-11-01T23:00:00Z', false],
  ])('limits the next seven local days for %s', (dueAt, expected) => {
    expect(matches(focus('upcoming'), { dueAt })).toBe(expected);
  });

  it('reviews missed days without classifying earlier today as overdue', () => {
    expect(matches(focus('overdue'), { dueAt: '2026-10-24T21:59:59Z' })).toBe(
      true,
    );
    expect(matches(focus('overdue'), { dueAt: '2026-10-24T22:00:00Z' })).toBe(
      false,
    );
    expect(matches(focus('overdue'), { dueAt: null })).toBe(false);
  });

  it.each([
    ['DONE', 'TODO', false],
    ['TODO', 'DONE', true],
    [null, 'DONE', false],
    [null, 'TODO', true],
    [null, null, true],
  ])(
    'uses Projects status %s before native status %s',
    (projectStatus, status, expected) => {
      expect(matches(focus('mine'), { projectStatus, status })).toBe(expected);
      expect(matches(focus('mine', true), { projectStatus, status })).toBe(
        true,
      );
    },
  );

  it('works without the Projects application or access to its fields', () => {
    const nativeFields = fields.filter(
      (field) => field.name !== 'projectStatus',
    );
    expect(
      matches(focus('mine', false, nativeFields), { status: 'DONE' }),
    ).toBe(false);
    expect(matches(focus('mine', false, nativeFields), { status: null })).toBe(
      true,
    );
  });

  it.each([
    ['today', '2026-10-24T22:00:00Z'],
    ['upcoming', '2026-10-25T23:00:00Z'],
  ] as const)(
    'creates a visible assigned task from %s using native defaults',
    (scope, dueAt) => {
      const selectedView = focus(scope);
      const input = buildRecordInputFromFilter({
        currentRecordFilters: filtersFor(selectedView),
        objectMetadataItem,
        currentWorkspaceMember: { id: MEMBER_ID } as CurrentWorkspaceMember,
        timeZone: 'Europe/Paris',
      });
      expect(input).toEqual(
        expect.objectContaining({ assigneeId: MEMBER_ID, dueAt }),
      );
      expect(matches(selectedView, input)).toBe(true);
    },
  );

  it('preserves saved views and never changes their persisted filters', () => {
    const snapshot = structuredClone(view);
    expect(focus('view')).toBe(view);
    focus('today');
    expect(view).toEqual(snapshot);
  });
});
