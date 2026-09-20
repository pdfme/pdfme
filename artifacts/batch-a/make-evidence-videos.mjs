import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf';

const clips = {
  460: {
    file: 'evidence-460-cmyk-qr.mp4',
    text: `Issue #460 - CMYK QR code

Runtime check:
- Generated artifacts/batch-a/issue-460-cmyk-qr.pdf with options.colorType = cmyk.
- Inspected PDF image dictionaries.
- Embedded QR image ColorSpace: /DeviceRGB.

Status: reproduces
Maintainer action: keep`,
  },
  495: {
    file: 'evidence-495-large-pdf-viewer.mp4',
    text: `Issue #495 - Viewer with large PDFs

Runtime check:
- Generated synthetic 80-page PDF.
- pdf2size processed all pages.
- pdf2img rendered all 80 page images eagerly.
- Source path useUIPreProcessor awaits pdf2size + pdf2img for whole basePdf.

Status: needs_more_info
Maintainer action: need author sample / defer`,
  },
  623: {
    file: 'evidence-623-cropbox-mediabox.mp4',
    text: `Issue #623 - CropBox != MediaBox

Runtime check:
- Created 300x200 pt PDF with CropBox x=50 y=40 w=200 h=120.
- Generated overlay on current main.
- Output page size: 200x120.
- Output CropBox: x=0 y=0 w=200 h=120.

Status: fixed_already
Maintainer action: close-as-fixed if no counterexample is provided`,
  },
  638: {
    file: 'evidence-638-cjk-space-wrap.mp4',
    text: `Issue #638 - CJK blank-space wrapping

Runtime check:
- Generated Japanese text PDF with NotoSansJP.
- Current text wrap source uses Intl.Segmenter/UAX #14.
- Existing integration-segmenter fixture covers Japanese wrapping.
- Output PDF/PNG saved for visual inspection.

Status: fixed_already
Maintainer action: close-as-fixed or ask for exact old template if mismatch remains`,
  },
  1348: {
    file: 'evidence-1348-aes256-v5-r5.mp4',
    text: `Issue #1348 - AES-256 V=5/R=5 encrypted PDFs

Runtime check:
- Looked for suitable repo fixture.
- encrypted_new.pdf requires a non-empty password and did not exercise the report.
- qpdf and pikepdf are unavailable in this workspace to synthesize V=5/R=5.

Status: needs_more_info
Maintainer action: need author fixture or exact creation steps`,
  },
  1397: {
    file: 'evidence-1397-designer-undo-simulated.mp4',
    text: `Issue #1397 - Designer undo across added pages

Runtime check:
- Simulated current timeTravel logic from packages/ui/src/hooks.ts.
- Before undo: page1=field1, page2=field2,field3.
- After undo on page 1: page1=field2, page2=field2,field3.
- The history stack stores only schemasList[pageCursor].

Status: reproduces
Maintainer action: keep`,
  },
  1433: {
    file: 'evidence-1433-svg-japanese-fonts.mp4',
    text: `Issue #1433 - SVG plugin non-Latin fonts

Runtime check:
- Generated SVG schema containing Japanese text.
- Supplied NotoSansJP in generate() options.font.
- Current SVG plugin calls page.drawSvg(...) without fonts.
- generate() threw: WinAnsi cannot encode U+65E5.

Status: reproduces
Maintainer action: keep`,
  },
};

for (const [issue, clip] of Object.entries(clips)) {
  const textPath = path.join(__dirname, `evidence-${issue}.txt`);
  const videoPath = path.join(__dirname, clip.file);
  await fs.writeFile(textPath, clip.text);
  execFileSync('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x111111:s=1280x720:d=8:r=30',
    '-vf',
    `drawtext=fontfile=${fontFile}:textfile=${textPath}:fontcolor=white:fontsize=25:x=44:y=44:line_spacing=8`,
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    videoPath,
  ]);
  console.log(videoPath);
}
