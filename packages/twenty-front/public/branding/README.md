# A2E Suite identity assets

These PNGs are unchanged copies of the supplied transparent artwork. Keep the
artwork's colors, proportions and transparency; contain it within its box.

- `suite.png`: shared platform, account entry, workspace fallback and marketing.
- `bureau.png`: Bureau Pages, Projects and Discussions.
- `bilan.png`: Bilan finance.
- `agenda.png`: the native calendar.
- `syna.png`: the assistant and its CRM add-on.
- `favicon*`, `icon-*`, `apple-touch-icon.png`: supplied browser/PWA exports.

Application ownership is resolved through stable universal identifiers in
`A2eApplicationLogos.ts`, not translated or editable names. Custom applications
and personal folders retain their own icons. No dedicated Archive, CRM or Links
artwork was supplied; their existing semantic icons remain available.

The supplied brand fonts are self-hosted in `fonts/`: Plus Jakarta Sans normal
and italic variable weights for interface text, and Dream Kudos for the public
homepage hero accent only. The shared pigment definition lives in
`twenty-ui/src/theme/constants/A2eBrandColors.ts`; preserve the supplied PNG
artwork independently of CSS theme changes.
