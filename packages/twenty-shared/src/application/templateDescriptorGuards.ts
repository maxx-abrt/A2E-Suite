import {
  type TemplateDescriptor,
  type TemplateDescriptorValidation,
} from './templateDescriptorType';

// Guards and a pure validator for the C1 descriptor contract. The guards use
// structural checks (not `instanceof`) so a descriptor crossing the logic
// function boundary — plain JSON, no class identity — still validates.

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const isTemplateDescriptorLabels = (
  value: unknown,
): value is TemplateDescriptor['labels'] => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const labels = value as Record<string, unknown>;

  return isNonEmptyString(labels.fr) && isNonEmptyString(labels.en);
};

export const isTemplateDescriptorInput = (
  value: unknown,
): value is TemplateDescriptor['inputs'][number] => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const input = value as Record<string, unknown>;

  return (
    isNonEmptyString(input.key) &&
    isTemplateDescriptorLabels(input.label) &&
    typeof input.required === 'boolean'
  );
};

export const isTemplateDescriptorPreviewWrite = (
  value: unknown,
): value is TemplateDescriptor['preview'][number] => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const write = value as Record<string, unknown>;

  return (
    isNonEmptyString(write.object) &&
    isTemplateDescriptorLabels(write.summary) &&
    isPositiveInteger(write.count)
  );
};

export const isTemplateDescriptor = (
  value: unknown,
): value is TemplateDescriptor => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const descriptor = value as Record<string, unknown>;

  return (
    isNonEmptyString(descriptor.key) &&
    isPositiveInteger(descriptor.version) &&
    isTemplateDescriptorLabels(descriptor.labels) &&
    isNonEmptyString(descriptor.category) &&
    Array.isArray(descriptor.requiredApps) &&
    descriptor.requiredApps.every(isNonEmptyString) &&
    Array.isArray(descriptor.inputs) &&
    descriptor.inputs.every(isTemplateDescriptorInput) &&
    Array.isArray(descriptor.preview) &&
    descriptor.preview.every(isTemplateDescriptorPreviewWrite)
  );
};

// Cross-descriptor invariants shared by every app's registry: keys are unique
// within the suite, and a descriptor's own key is never repeated across apps.
export const validateTemplateDescriptors = (
  descriptors: TemplateDescriptor[],
): TemplateDescriptorValidation => {
  const errors: string[] = [];
  const seenKeys = new Set<string>();

  for (const descriptor of descriptors) {
    if (!isTemplateDescriptor(descriptor)) {
      errors.push(
        `Descripteur de modèle invalide : ${String(
          (descriptor as { key?: unknown } | null)?.key,
        )}.`,
      );
      continue;
    }

    if (seenKeys.has(descriptor.key)) {
      errors.push(`Clé de modèle dupliquée : ${descriptor.key}.`);
    }

    seenKeys.add(descriptor.key);

    if (descriptor.requiredApps.includes(descriptor.key)) {
      errors.push(`Le modèle ${descriptor.key} se requiert lui-même.`);
    }
  }

  return { valid: errors.length === 0, errors };
};
