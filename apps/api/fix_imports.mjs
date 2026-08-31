import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = join(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

const targets = [
  'errors',
  'middleware',
  'db',
  'types/userTypes',
  'app.js',
  'app'
];

async function run() {
  const allFiles = await getFiles('src/v1');
  const filesToProcess = allFiles.filter(f => f.match(/\.(ts|js|tsx|jsx)$/) && !f.replace(/\\/g, '/').match(/src\/v1\/(controllers|services)\/.*(?<!test)\.(ts|js)$/) && !f.replace(/\\/g, '/').match(/src\/v1\/routes\/index\.ts$/));
  
  let changedFiles = 0;
  for (const file of filesToProcess) {
    let content = await readFile(file, 'utf8');
    let hasChanges = false;
    
    // (from|unstable_mockModule\(|import\()\s*(['"])((?:\.\.\/)+)(errors|middleware|db|types\/userTypes|app\.js|app)((?:\/|\.).*?)?\2
    const regex = new RegExp(`(from|unstable_mockModule\\(|import\\()\\s*(['"])((?:\\.\\.\\/)+)(${targets.join('|')})((?:\\/|\\.).*?)?\\2`, 'g');
    
    const newContent = content.replace(regex, (match, p1, p2, p3, p4, p5) => {
      hasChanges = true;
      const result = `${p1} ${p2}../${p3}${p4}${p5 || ''}${p2}`;
      return result.replace(/import\(\s+['"]/, `import('${p2}`).replace(/unstable_mockModule\(\s+['"]/, `unstable_mockModule('${p2}`);
    });

    if (hasChanges) {
      await writeFile(file, newContent, 'utf8');
      changedFiles++;
    }
  }
  console.log(`Updated imports in ${changedFiles} files.`);
}

run().catch(console.error);
