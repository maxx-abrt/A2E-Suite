import { type TemplateDescriptor } from 'twenty-shared/application';

export type TemplateGallerySourceApplication = {
  universalIdentifier: string;
  name: string;
};

// A descriptor plus the two install-time facts the gallery renders: which
// installed app shipped it, and whether every app it requires is present.
// `available` is derived from `requiredApps` and never authored, so the C1
// contract stays the single source of truth for dependencies.
export type TemplateGalleryItem = {
  descriptor: TemplateDescriptor;
  sourceApplication: TemplateGallerySourceApplication;
  available: boolean;
};
