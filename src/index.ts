import readline from 'readline';
import fs from 'fs';
import path from 'path';
import precinct from 'precinct';

// make true to see files skipped
let rootPath = '';
let targetFile = '';

const filesToScan = [];
const matchingFiles = [];
const resolvedDependencies = {};
const unresolvedDependencies = [];

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

const scan = (directoryName: string, results = []) => {
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
  const debug = process.argv.includes('--debug');

  do {
    const dirPath = (await askQuestion("Enter the project's root path (or the path to package.json): ")) as string;
    try {
      const stat = fs.lstatSync(dirPath);
      if (stat.isDirectory()) {
        rootPath = dirPath.replace(/\/$/, '');
        continue;
      }
      if (stat.isFile()) {
        rootPath = path.dirname(dirPath).replace(/\/$/, '');
        continue;
      }
    } catch (e) {
      // do nothing
    }
    console.log('That is not a valid directory');
  } while (rootPath === '');

  scan(rootPath, filesToScan);

  do {
    const targetFilePath = (await askQuestion('Enter a file within the project to search for: ')) as string;
    try {
      const resolvedTargetFilePath = targetFilePath.match('^/.*') ? targetFilePath : `${rootPath}/${targetFilePath}`;
      const stat = fs.lstatSync(resolvedTargetFilePath);
      if (stat.isFile()) {
        if (resolvedTargetFilePath.match(`^${rootPath}.+$`)) {
          targetFile = resolvedTargetFilePath as string;
          continue;
        } else {
          console.log('Please choose a file within the project directory.');
        }
      }
    } catch (e) {
      // do nothing
    }
    console.log('That is not a valid file');
  } while (targetFile === '');

  console.log(`Searching...`);

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
      if (result) {
        resolvedPaths.push(result);
        if (!Object.values(resolvedDependencies).includes(result)) {
          resolvedDependencies[depPath] = result;
        }
      } else {
        if (!unresolvedDependencies.includes(depPath)) {
          unresolvedDependencies.push(depPath);
        }
      }
    }
    const filteredPaths = resolvedPaths.filter((resolvedPath) => {
      return !resolvedPath.match(skipDirsRegex);
    });
    if (filteredPaths.includes(targetFile)) {
      matchingFiles.push(filePath);
    }
  }
  console.log(`Dependencies resolved: ${Object.keys(resolvedDependencies).length}`);
  if (debug && Object.keys(resolvedDependencies).length > 0) {
    for (const resolvedDependency of Object.keys(resolvedDependencies).sort()) {
      console.log(`${resolvedDependency} --> ${resolvedDependencies[resolvedDependency]}`);
    }
    console.log('------------------------------');
  }
  console.log(`Dependencies skipped: ${unresolvedDependencies.length}`);
  if (debug && unresolvedDependencies.length) {
    for (const unresolvedDependency of unresolvedDependencies.sort()) {
      console.log(unresolvedDependency);
    }
    console.log('------------------------------');
  }

  console.log(`Files found: ${matchingFiles.length}`);
  matchingFiles.forEach((file) => {
    console.log(file);
  });
  console.log('------------------------------');
};

main();
