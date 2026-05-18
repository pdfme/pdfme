import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type AuthoringStarterFixture = {
  assetName: string;
  description: string;
  label: string;
  source: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateAssetsDir = path.resolve(__dirname, '../public/template-assets');

export const readAuthoringStarterFixtures = (kind: 'jsx' | 'md2pdf'): AuthoringStarterFixture[] => {
  const sourceFileName = kind === 'jsx' ? 'source.tsx' : 'source.md';

  return fs
    .readdirSync(templateAssetsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .flatMap((entry) => {
      const assetPath = path.join(templateAssetsDir, entry.name);
      const sourcePath = path.join(assetPath, sourceFileName);
      const metadataPath = path.join(assetPath, 'metadata.json');
      if (!fs.existsSync(sourcePath) || !fs.existsSync(metadataPath)) return [];

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as {
        description: string;
        sourceKind: string;
        title: string;
      };
      if (metadata.sourceKind !== kind) return [];

      return [
        {
          assetName: entry.name,
          description: metadata.description,
          label: metadata.title,
          source: fs.readFileSync(sourcePath, 'utf-8'),
        },
      ];
    });
};
