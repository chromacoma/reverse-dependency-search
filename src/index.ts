import readline from 'readline';
import fs from 'fs';
import path from 'path';
import precinct from 'precinct';

// make true to see files skipped
const debug = false;

let rootPath = '';
let targetFile = '';

const filesToScan = [];
const matchingFiles = [];

const pathRegex = '^.*.(ts|tsx|js|jsx)$';
const skipDirsRegex = '^.*(node_modules|dist)';
const allowedExtensions = ['', '.js', '.jsx', '.ts', '.tsx', '.json'];

const askQuestion = async (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
};

const scan = (directoryName = './data', results = []) => {
  const files = fs.readdirSync(directoryName);
  for (const f of files) {
    const fullPath = path.join(directoryName, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !fullPath.match(skipDirsRegex)) {
      scan(fullPath, results);
    } else if (fullPath.match(pathRegex)) {
      results.push(fullPath);
    }
  }
  return results;
};

const main = async () => {
  do {
    const dirPath = (await askQuestion('Enter the project root path: ')) as string;
    try {
      const stat = fs.lstatSync(dirPath);
      if (stat.isDirectory()) {
        rootPath = dirPath.replace(/\/$/, '');
        continue;
      }
    } catch (e) {
      // do nothing
    }
    console.log('That is not a valid directory');
  } while (rootPath === '');

  scan(rootPath, filesToScan);

  do {
    const targetFilePath = (await askQuestion('Enter a file to search for: ')) as string;
    try {
      const stat = fs.lstatSync(targetFilePath);
      if (stat.isFile() && targetFilePath.match(`^${rootPath}.+$`)) {
        targetFile = targetFilePath as string;
        continue;
      }
    } catch (e) {
      // do nothing
    }
    console.log('That is not a valid file');
  } while (targetFile === '');

  console.log('\n');
  console.log(`Searching...`);

  let skippedFiles = 0;
  let foundFiles = 0;

  for (const filePath of filesToScan) {
    const deps = precinct.paperwork(filePath, 'utf8');
    const resolvedPaths = [];
    for (const depPath of deps) {
      const searchPaths = [rootPath, path.dirname(filePath), `${rootPath}/node_modules`];
      let result = '';
      for (const searchPath of searchPaths) {
        for (const allowedExtension of allowedExtensions) {
          const fullPath = path.join(searchPath, `${depPath}${allowedExtension}`);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() || stat.isFile()) {
              result = fullPath;
            }
          } catch (e) {
            // do nothing
          }
        }
      }
      if (!result) {
        if (debug) console.log(depPath);
        skippedFiles += 1;
      } else {
        resolvedPaths.push(result);
        foundFiles += 1;
      }
    }
    const filteredPaths = resolvedPaths.filter((resolvedPath) => {
      return resolvedPath.indexOf('node_modules') === -1;
    });
    if (filteredPaths.includes(targetFile)) {
      matchingFiles.push(filePath);
    }
  }
  console.log('\n');
  console.log(`Packages resolved: ${foundFiles}`);
  console.log(`Packages skipped: ${skippedFiles}`);
  console.log(`Files found: ${matchingFiles.length}`);
  matchingFiles.forEach((file) => {
    console.log(file);
  });
  console.log('\n');
};

main();
