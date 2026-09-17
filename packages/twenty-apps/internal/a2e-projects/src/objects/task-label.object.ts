import {
  defineObject,
  FieldType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  OBJECT_IDS,
  RELATION_IDS,
  TASK_FIELD_IDS,
} from '../constants/universal-identifiers.ts';

// task ↔ label junction. Both FKs CASCADE so deleting a task or a label
// never orphans rows; the label.side inverse (labelTaskLabels / labelsOnTask
// one-to-many) is declared on label.object.ts and points back here.
export default defineObject({
  universalIdentifier: OBJECT_IDS.taskLabel,
  nameSingular: 'taskLabel',
  namePlural: 'taskLabels',
  labelSingular: 'Étiquette de tâche',
  labelPlural: 'Étiquettes de tâche',
  description: 'Liaison entre une tâche et une étiquette.',
  icon: 'IconTag',
  fields: [
    {
      universalIdentifier: RELATION_IDS.taskLabelLabel,
      type: FieldType.RELATION,
      name: 'label',
      label: 'Étiquette',
      icon: 'IconTag',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.label,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.labelTaskLabels,
      universalSettings: {
        ...manyToOne('taskLabelLabelId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.labelsOnTask,
      type: FieldType.RELATION,
      name: 'task',
      label: 'Tâche',
      icon: 'IconDate',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier: TASK_FIELD_IDS.taskLabels,
      universalSettings: {
        ...manyToOne('taskLabelTaskId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
