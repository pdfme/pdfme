# Issue #926 - Upload custom fonts to the playground designer

Status: `still_missing`

## Rationale

- The playground uses a fixed `getFontsData()` map in `playground/src/helper.ts`.
- There are existing file inputs for templates/assets, and the library supports custom fonts through `options.font`, but the hosted playground Designer has no upload flow that registers a user font name/data into that map.
- Code search found no playground custom-font upload UI, persistence, or template-level font asset handling.

## Suggested action

Keep open as a playground feature. Decide where uploaded font data should live (session only, template JSON asset, project workspace asset, or hosted storage) before implementing the UI.

## Evidence

- `evidence-0926-playground-custom-font-upload.mp4`
