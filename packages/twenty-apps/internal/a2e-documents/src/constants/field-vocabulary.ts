import { FieldType, RelationType } from 'twenty-sdk/define';

// Shared field vocabulary. Options are DATA, so every select renders the same
// colors and labels wherever a document kind appears.

export const DOCUMENT_KIND = {
  DOCUMENT: 'DOCUMENT',
  TEMPLATE: 'TEMPLATE',
} as const;

// Matches twenty-shared TagColor, which the SDK keeps un-exported: typing the
// union here keeps option literals assignable to FieldMetadataComplexOption.
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
  id: `c31a0100-0005-4000-8000-0000000000${suffix}`,
  value,
  label,
  position,
  color,
});

export const documentKindOptions = [
  option('01', DOCUMENT_KIND.DOCUMENT, 'Document', 0, 'blue'),
  option('02', DOCUMENT_KIND.TEMPLATE, 'Modèle', 1, 'purple'),
];

// Starter tags; users add more in the UI (options are data, additive).
export const documentTagOptions = [
  option('11', 'MEETING_NOTES', 'Notes de réunion', 0, 'blue'),
  option('12', 'REFERENCE', 'Référence', 1, 'green'),
  option('13', 'DRAFT', 'Brouillon', 2, 'gray'),
];

export const oneToMany = {
  relationType: RelationType.ONE_TO_MANY,
} as const;

export const manyToOne = (joinColumnName: string) =>
  ({ relationType: RelationType.MANY_TO_ONE, joinColumnName }) as const;

export const RELATION = FieldType.RELATION;
