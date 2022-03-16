import fs from 'fs';
import path from 'path';
import precinct from 'precinct';
import { dependencies as rendrDependencies } from './templates/rendr';
import { askQuestion } from './util/askQuestion';
import { buildPathRegex } from './util/buildPathRegex';
import { scan, SKIP_DIRS_REGEX } from './util/scan';

// make true to see files skipped
let rootPath = '';
let targetFile = '';

const matchingFiles = [];
const resolvedDependencies = {};
const unresolvedDependencies = [];

export const DEFAULT_EXTENSIONS = ['', '.js', '.jsx', '.ts', '.tsx', '.json'];

const main = async () => {
  const debug = process.argv.includes('--debug') || process.argv.includes('-d');
  const template = process.argv.includes('-t')
    ? process.argv[process.argv.indexOf('-t') + 1]
    : process.argv.includes('--template')
    ? process.argv[process.argv.indexOf('--template') + 1]
    : null;

  const allowedExtensions = [...DEFAULT_EXTENSIONS];

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

  const filesToScan = scan(rootPath, buildPathRegex(allowedExtensions));

  do {
    const targetFilePath = (await askQuestion('Enter a file within the project to search for: ')) as string;
    const resolvedTargetFilePath = targetFilePath.match('^/.*') ? targetFilePath : `${rootPath}/${targetFilePath}`;
    try {
      const stat = fs.statSync(resolvedTargetFilePath);
      if (stat.isFile()) {
        if (resolvedTargetFilePath.match(`^${rootPath}.+$`)) {
          targetFile = resolvedTargetFilePath as string;
          continue;
        } else {
          console.log('Please choose a file within the project directory.');
        }
      }
    } catch (e) {
      const fileDeletedContinue = (await askQuestion("File doesn't exist. Continue? [yN] ")) as string;
      if (fileDeletedContinue === 'y') targetFile = resolvedTargetFilePath as string;
    }
  } while (targetFile === '');

  console.log(`Searching dependencies...`);

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
      return !resolvedPath.match(SKIP_DIRS_REGEX);
    });
    if (filteredPaths.includes(targetFile)) {
      matchingFiles.push(filePath);
    }
  }

  if (template === 'rendr') {
    console.log(`Searching template files...`);
    const {
      resolvedDependencies: rendrResolvedDependencies,
      unresolvedDependencies: rendrUnesolvedDependencies,
      matchingFiles: renderMatchingFiles,
    } = rendrDependencies(targetFile);
    Object.assign(resolvedDependencies, rendrResolvedDependencies);
    unresolvedDependencies.push(...rendrUnesolvedDependencies);
    matchingFiles.push(...renderMatchingFiles);
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
