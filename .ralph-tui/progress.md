# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Host-side Syna recipe family (no app, US-143):** prompt/action recipes ship as a host `SynaRecipeDescriptor` registry in `twenty-front/src/modules/ai/` (`TemplateDescriptor` + `status`/`requiredToolName`/`prompt fr+en`/`deferral`/source), projected to the gallery via `HOST_TEMPLATE_DESCRIPTOR_GROUPS` as a synthetic `a2e-host-syna` group containing only READY recipes. Each AI recipe names its registry tool through `buildLogicFunctionToolName` and install-gates on the owning app's universal identifier; the P7 invoice recipe stays registry-only `DEFERRED`. Apply is confirm-first (`useSynaRecipeApply` stages the prompt as a Syna draft, writes nothing). A new gallery category must be added to the shared closed `TemplateDescriptorCategory` union, then `npx nx build twenty-shared --skip-nx-cache` (and twenty-sdk) before twenty-front tsgo.

---

## [2026-10-01] - US-143
- What was implemented: the M9c Syna prompt/action recipe family (8 recipes) as a host-side `SynaRecipeDescriptor` registry; a gallery host group `a2e-host-syna` (7 READY recipes); confirm-first apply (stage the Syna prompt draft); a family validator, trigger→preview and P7-gate execution resolvers; the `draft-invoice-from-time-entries` recipe registered `DEFERRED` behind P7 and never projected to the gallery.
- Files changed: `twenty-shared/src/application/templateDescriptorType.ts`; `twenty-front/src/modules/ai/{types/SynaRecipeDescriptor.ts,constants/SynaRecipeDescriptors.ts,hooks/useSynaRecipeApply.ts,utils/{findSynaRecipeDescriptor,buildSynaRecipePreview,resolveSynaRecipeExecution,validateSynaRecipeDescriptors}.ts}` + tests; `twenty-front/src/modules/template-gallery/{constants/HostTemplateDescriptorGroups.ts,constants/TemplateGalleryCategoryConfig.ts,hooks/useApplyTemplate.ts}` + test; phase report.
- **Learnings:**
  - `isTemplateDescriptor` is a type guard over a subtype: `if (!isTemplateDescriptor(descriptor))` narrows `SynaRecipeDescriptor` to `never` inside the branch. Read it into a `const` boolean (or cast to `unknown`) to keep the descriptor's own fields accessible.
  - `TemplateDescriptorCategory` is a closed union driving `TEMPLATE_GALLERY_CATEGORY_CONFIG` (`Record<union>`), so a new family category must be added in twenty-shared and rebuilt before twenty-front tsgo.
  - `isNonEmptyString` is NOT in `twenty-shared/utils`; import it from `@sniptt/guards` (as `TemplateGallery.tsx` does).
---


## [2026-10-01] - US-143 (verification resume)
- What was implemented: nothing new — the M9c Syna prompt/action recipe family was already implemented and committed at `953a7a89` by the 19:26 run. This iteration independently re-verified all Tier-0 gates green from HEAD and reported `done-for-review` with zero changes.
- Files changed: none (verification only; phase report + this progress note appended).
- **Learnings:**
  - Ralph can have overlapping iterations: this session was assigned US-143 while the 19:26 run was still mid-flight and had already committed it (a US-144 `CLAIMED` line follows in the phase report). Before doing any work, always re-check `git log` / `git status` and the report tail — the assigned task may already be committed. Never rebuild committed work.
  - The host-side Syna recipe family pattern is captured in the Codebase Patterns section above.
---
