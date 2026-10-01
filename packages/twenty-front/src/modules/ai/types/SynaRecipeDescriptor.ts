import { type TemplateDescriptor } from 'twenty-shared/application';

// M9c — the Syna prompt/action recipe family (US-143).
//
// A recipe is a C1 descriptor (so the gallery and the M12d catalogue read it
// like any other template) plus the two facts the host needs to offer it
// confirm-first: the native registry tool it stages, and whether its execution
// leg is ready. Nothing here executes a recipe: applying one only stages a Syna
// prompt draft, which the user still confirms (UX principle 5).
export type SynaRecipeStatus = 'READY' | 'DEFERRED';

export type SynaRecipeDeferral = {
  gatedBy: string;
  reason: string;
};

export type SynaRecipeDescriptor = TemplateDescriptor & {
  status: SynaRecipeStatus;
  // The registry tool name (`toolTriggerSettings`) this recipe stages, or null
  // for a recipe whose steps are native primitives (e.g. Bilan's subvention
  // matching core action) rather than an AI tool.
  requiredToolName: string | null;
  prompt: {
    fr: string;
    en: string;
  };
  deferral?: SynaRecipeDeferral;
  sourceUniversalIdentifier: string;
  sourceName: string;
};

// What the host learns before running a recipe: a READY recipe names the tool
// it stages; a DEFERRED recipe names the gate that blocks it, so the caller
// reports the deferral instead of half-running.
export type SynaRecipeExecution =
  | { status: 'READY'; requiredToolName: string | null }
  | { status: 'DEFERRED'; gatedBy: string };

export type SynaRecipePreview = {
  key: string;
  status: SynaRecipeStatus;
  writes: TemplateDescriptor['preview'];
};
