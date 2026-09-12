import { defineField, FieldType } from 'twenty-sdk/define';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// T-shirt estimate projected as a colored label — Text field with options
// (matches how real-estate types Text with a Select's options enum).
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.estimateLabel,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'estimateLabel',
  label: 'Estimation (taille)',
  description: 'Équivalent T-shirt de la charge, synchronisé avec Estimation',
  icon: 'IconAbc',
  isNullable: true,
  options: [
    { id: 'c31a0201-0005-4000-8000-000000000081', value: 'XS', label: 'XS', position: 0, color: 'sky' },
    { id: 'c31a0201-0005-4000-8000-000000000082', value: 'S', label: 'S', position: 1, color: 'green' },
    { id: 'c31a0201-0005-4000-8000-000000000083', value: 'M', label: 'M', position: 2, color: 'yellow' },
    { id: 'c31a0201-0005-4000-8000-000000000084', value: 'L', label: 'L', position: 3, color: 'orange' },
    { id: 'c31a0201-0005-4000-8000-000000000085', value: 'XL', label: 'XL', position: 4, color: 'red' },
  ],
} as never) as ReturnType<typeof defineField>;
