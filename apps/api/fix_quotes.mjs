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

async function run() {
  const allFiles = await getFiles('src/v1');
  const filesToProcess = allFiles.filter(f => f.match(/\.(ts|js|tsx|jsx)$/));
  
  let changedFiles = 0;
  for (const file of filesToProcess) {
    let content = await readFile(file, 'utf8');
    
    // Fix the double quote issue caused by previous script
    const newContent = content
      .replace(/import\(''/g, "import('")
      .replace(/import\(""/g, 'import("')
      .replace(/unstable_mockModule\(''/g, "unstable_mockModule('")
      .replace(/unstable_mockModule\(""/g, 'unstable_mockModule("');

    if (content !== newContent) {
      await writeFile(file, newContent, 'utf8');
      changedFiles++;
    }
  }
  console.log(`Fixed double quotes in ${changedFiles} files.`);
}

run().catch(console.error);
