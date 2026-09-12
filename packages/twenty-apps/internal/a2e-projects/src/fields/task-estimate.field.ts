import { defineField, FieldType } from 'twenty-sdk/define';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// T-shirt sizing, per PLAN P4.1 "estimate (t-shirt)". Plain-text estimate for
// free display; the colored projected variant is estimateLabel.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.estimate,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'estimate',
  label: 'Estimation',
  description: 'Charge estimée (T-shirt : XS, S, M, L, XL)',
  icon: 'IconScale',
  isNullable: true,
});
