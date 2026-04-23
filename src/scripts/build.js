const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

function getJavaScriptFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...getJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const files = getJavaScriptFiles(ROOT_DIR).sort();

  if (!files.length) {
    console.log('build check passed: no JavaScript files found');
    return;
  }

  for (const filePath of files) {
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
  }

  console.log(`build check passed: ${files.length} JavaScript files validated`);
}

try {
  main();
} catch (error) {
  if (error.stdout) {
    process.stdout.write(error.stdout);
  }

  if (error.stderr) {
    process.stderr.write(error.stderr);
  }

  console.error('build check failed');
  process.exit(1);
}
