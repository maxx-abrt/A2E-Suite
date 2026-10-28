# Public site assets

The native public site retains the local `packages/twenty-website` section
rhythm, type scale, notched footer. Its ASCII illustrations are generated from local 3D geometry
by `scripts/generate-public-ascii.mjs`; no client-side 3D renderer is used. Its token adapter
applies the A2E brand palette, rounded controls and Plus Jakarta Sans; Dream
Kudos appears only in the homepage hero accent. Brand fonts are self-hosted
under `public/branding/fonts`. Internal package names remain unchanged.

The retained ASCII font is the self-hosted Azeret Mono Latin subset under SIL
Open Font License 1.1; see `packages/twenty-website/src/fonts/README.md` for its
source. The older Host Grotesk and Aleo assets remain available. No remote font,
booking, customer or community service is required by the public page.
