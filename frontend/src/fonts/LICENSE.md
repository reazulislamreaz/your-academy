# Self-hosted fonts

| File | Font | Source | License |
|------|------|--------|---------|
| `inter-latin-wght.woff2` | Inter (variable, latin subset) v20 | Google Fonts | SIL Open Font License 1.1 |
| `noto-sans-bengali-bengali-wght.woff2` | Noto Sans Bengali (variable, bengali subset) v33 | Google Fonts | SIL Open Font License 1.1 |

Copied from `fonts.gstatic.com` so production builds never depend on Google Fonts
being reachable (DEC-049). OFL text: https://openfontlicense.org/open-font-license-official-text/

To update: request `https://fonts.googleapis.com/css2?family=Inter:wght@400..700` /
`Noto+Sans+Bengali:wght@100..900` with a modern browser User-Agent, download the
`/* latin */` and `/* bengali */` woff2 URLs, and keep the unicode-range in
`src/lib/fonts.ts` in sync.
