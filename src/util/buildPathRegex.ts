export const buildPathRegex = (extensions: string[]): string =>
  `^.*.${extensions
    .map((ext) => ext.replace(/^\./, ''))
    .filter((ext) => ext.length > 0)
    .join('|')}$`;
