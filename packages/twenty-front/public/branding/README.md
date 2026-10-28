# A2E Suite identity assets

These PNGs are unchanged copies of the supplied transparent artwork. Keep the
artwork's colors, proportions and transparency; contain it within its box.

- `suite.png`: shared platform, account entry, workspace fallback and marketing.
- `bureau.png`: Bureau Pages, Projects and Discussions.
- `bilan.png`: Bilan finance.
- `agenda.png`: the native calendar.
- `syna.png`: the assistant and its CRM add-on.
- `archive.png`: Archive file management.
- `*-ascii.png`: supplied transparent ASCII illustrations for large public application cards; compact marks remain in card labels and navigation.
- `favicon*`, `icon-*`, `apple-touch-icon.png`: supplied browser/PWA exports.

Application ownership is resolved through stable universal identifiers in
`A2eApplicationLogos.ts`, not translated or editable names. Custom applications
and personal folders retain their own icons. No dedicated CRM or Links artwork was supplied; their existing semantic icons
remain available. Application card illustrations sit directly on the page surface,
without colored backplates, cropping or recoloring. A static SVG opacity filter
preserves the fine ASCII strokes when scaled down; the source PNGs stay unchanged.
Sidebar marks resolve from cached installed-application identity and use stable
components; no logo polling or additional network query is needed.

The supplied brand fonts are self-hosted in `fonts/`: Plus Jakarta Sans normal
and italic variable weights for interface text, and Dream Kudos for the public
homepage hero accent only. The shared pigment definition lives in
`twenty-ui/src/theme/constants/A2eBrandColors.ts`; preserve the supplied PNG
artwork independently of CSS theme changes.
