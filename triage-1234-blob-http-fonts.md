# Issue #1234 - Support blob:http font URLs in getFontKitFont

Status: `still_missing`

## Rationale

- `getFontKitFont()` treats string font data as fetchable only when `fontData.startsWith('http')`; otherwise it decodes the string as base64 (`packages/schemas/src/text/helper.ts`).
- `fetchRemoteFontData()` also validates URLs through `isUrlSafeToFetch()`, whose error message allows only public `http:` and `https:` URLs.
- A `blob:http...` URL does not start with `http`, so current main still takes the base64 path rather than fetching the blob.

## Suggested action

Keep open. If accepted, update both string dispatch and URL-safety policy/tests for browser-only `blob:` font URLs, while preserving SSR/Node behavior and existing remote URL protections.

## Evidence

- `evidence-1234-blob-http-fonts.mp4`
