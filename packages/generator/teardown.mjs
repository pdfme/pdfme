import path from 'path';
import { readdir, unlink } from 'fs/promises';

export default async () => {
  const dir = path.join(path.dirname(''), '__tests__/assets/pdfs/tmp');
  const files = await readdir(dir);

  for (const file of files) {
    if (file !== '.gitkeep') {
      try {
        await unlink(`${dir}/${file}`);
      } catch (e) {
        throw e;
      }
    }
  }
};