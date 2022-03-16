import fs from 'fs';
import path from 'path';

export const SKIP_DIRS_REGEX = '^.*(node_modules|dist)';

export const scan = (directoryName: string, pathRegex: string): string[] => {
  const results = [];
  const files = fs.readdirSync(directoryName);
  for (const f of files) {
    const fullPath = path.join(directoryName, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !fullPath.match(SKIP_DIRS_REGEX)) {
      results.push(...scan(fullPath, pathRegex));
    } else if (fullPath.match(pathRegex)) {
      results.push(fullPath);
    }
  }
  return results;
};
