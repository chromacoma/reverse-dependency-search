import fs from 'fs';
import p from 'path';
import { DEFAULT_EXTENSIONS } from '../index';
import { buildPathRegex } from '../util/buildPathRegex';
import { scan } from '../util/scan';

export const TEMPLATE_EXTENSIONS = ['.emblem'];

type DependenciesResult = {
  resolvedDependencies: Record<string, string>;
  unresolvedDependencies: string[];
  matchingFiles: string[];
};
export const dependencies = (path: string): DependenciesResult => {
  const resolvedDependencies = {};
  const unresolvedDependencies = [];
  const matchingFiles = [];
  const pathMatcher = path.match('^(.*)/(views|templates)/(.+).(js|emblem)');
  if (pathMatcher) {
    const isView = pathMatcher[2] === 'views';
    const templatesDir = p.join(pathMatcher[1], 'templates');
    const templateDirsToSearch = [templatesDir];
    const dirMatcher = pathMatcher[1].match('(.*)/(shared|apps)');
    if (dirMatcher[2] === 'shared') {
      const appsDir = p.join(dirMatcher[1], 'apps');
      const appNames = fs.readdirSync(appsDir);
      for (const appName of appNames) {
        templateDirsToSearch.push(p.join(appsDir, appName, 'app', 'templates'));
      }
    }
    const templatePath = isView ? p.join(pathMatcher[1], 'templates', `${pathMatcher[3]}.emblem`) : path;
    const viewPath = isView ? path : p.join(pathMatcher[1], 'views', `${pathMatcher[3]}.js`);
    const sharedTemplatesDir = dirMatcher ? p.join(dirMatcher[1], 'shared', 'templates') : null;

    for (const templateDirToSearch of templateDirsToSearch) {
      if (fs.existsSync(templateDirToSearch)) {
        const templates = scan(templateDirToSearch, buildPathRegex([...DEFAULT_EXTENSIONS, ...TEMPLATE_EXTENSIONS]));

        for (const template of templates) {
          const templateReferences = extractFilesFromTemplate(template);
          // if (
          //   template ===
          //   '/Users/jadair/work/github.com/change/fe/rendr-fe/apps/change/app/templates/petitions/components/partials/single_click_sign_share_flash_messages.emblem'
          // ) {
          //   console.log(templateReferences);
          // }
          for (const templateReference of templateReferences) {
            const templateFile = fs.existsSync(p.join(templateDirToSearch, `${templateReference}.emblem`))
              ? p.join(templateDirToSearch, `${templateReference}.emblem`)
              : fs.existsSync(p.join(sharedTemplatesDir, `${templateReference}.emblem`))
              ? p.join(sharedTemplatesDir, `${templateReference}.emblem`)
              : null;
            if (templateFile) {
              if (!Object.values(resolvedDependencies).includes(templateReference)) {
                resolvedDependencies[templateReference] = templateFile;
              }
            } else {
              if (!unresolvedDependencies.includes(templateReference)) {
                unresolvedDependencies.push(templateReference);
              }
            }
            if (templateFile === templatePath) {
              if (!matchingFiles.includes(template)) {
                matchingFiles.push(template);
                const matchingView = viewForTemplate(template);
                if (matchingView) matchingFiles.push(matchingView);
              }
              // matchingFiles.push(templateView);
            }
          }
        }
      }
    }
    matchingFiles.push(isView ? templatePath : viewPath);
  }

  return { resolvedDependencies, unresolvedDependencies, matchingFiles };
};

const INCLUDE_METHODS = ['view', 'partial'];

const viewForTemplate = (templatePath: string): string | undefined => {
  const matcher = templatePath.match('^(.*)/templates/(.*).emblem$');
  const viewPath = p.join(matcher[1], 'views', `${matcher[2]}.js`);
  return fs.existsSync(viewPath) ? viewPath : null;
};

type TemplateReferences = string[];

const extractFilesFromTemplate = (templatePath: string): TemplateReferences => {
  const fileContents = fs.readFileSync(templatePath);
  const lines = fileContents.toString().split('\n');
  const fileRefs = [];
  for (const line of lines) {
    const match = line.match(`^.*(${INCLUDE_METHODS.join('|')})\\s*?['"](.+?)['"].*$`);
    if (match) {
      console.log(line);
      console.log(match[2]);
      fileRefs.push(match[2]);
    }
  }
  return fileRefs;
};
