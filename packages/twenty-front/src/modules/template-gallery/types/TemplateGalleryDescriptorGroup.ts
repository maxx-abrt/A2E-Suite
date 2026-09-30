import { type TemplateDescriptor } from 'twenty-shared/application';

// What one installed app's `list-template-descriptors` logic function returns,
// tagged with the app identity the gallery groups and attributes by. Keeping
// the app out of the descriptor is deliberate: the C1 contract stays pure data,
// provenance is added by the consumer.
export type TemplateGalleryDescriptorGroup = {
  applicationUniversalIdentifier: string;
  applicationName: string;
  templates: TemplateDescriptor[];
};
