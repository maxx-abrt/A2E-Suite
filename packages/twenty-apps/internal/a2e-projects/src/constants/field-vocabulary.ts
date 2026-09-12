import { FieldType, RelationType } from 'twenty-sdk/define';

// Shared field vocabulary. Options are DATA, so a status renders the same
// color everywhere it appears (task columns, boards, project list views).
// Follows A2E Documents' field-vocabulary.ts pattern, including the
// OptionColor union typed here because the SDK keeps TagColor un-exported.
type OptionColor =
  | 'red'
  | 'ruby'
  | 'crimson'
  | 'tomato'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'grass'
  | 'green'
  | 'jade'
  | 'mint'
  | 'turquoise'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'iris'
  | 'violet'
  | 'purple'
  | 'plum'
  | 'pink'
  | 'bronze'
  | 'gold'
  | 'brown'
  | 'gray';

const option = (
  suffix: string,
  value: string,
  label: string,
  position: number,
  color: OptionColor,
) => ({
  id: `c31a0200-0005-4000-8000-0000000000${suffix}`,
  value,
  label,
  position,
  color,
});

export const PROJECT_STATUS = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
} as const;

export const PROJECT_HEALTH = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  OFF_TRACK: 'OFF_TRACK',
} as const;

export const projectStatusOptions = [
  option('01', PROJECT_STATUS.PLANNING, 'Planification', 0, 'sky'),
  option('02', PROJECT_STATUS.ACTIVE, 'En cours', 1, 'green'),
  option('03', PROJECT_STATUS.ON_HOLD, 'En pause', 2, 'orange'),
  option('04', PROJECT_STATUS.COMPLETED, 'Terminé', 3, 'purple'),
];

export const projectHealthOptions = [
  option('11', PROJECT_HEALTH.ON_TRACK, 'Dans les temps', 0, 'green'),
  option('12', PROJECT_HEALTH.AT_RISK, 'À risque', 1, 'orange'),
  option('13', PROJECT_HEALTH.OFF_TRACK, 'En difficulté', 2, 'red'),
];

export const oneToMany = {
  relationType: RelationType.ONE_TO_MANY,
} as const;

export const manyToOne = (joinColumnName: string) =>
  ({ relationType: RelationType.MANY_TO_ONE, joinColumnName }) as const;
