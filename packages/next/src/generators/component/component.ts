import { addStyleDependencies } from '../../utils/styles';
import type { SupportedStyles } from '@nrwl/react';
import { componentGenerator as reactComponentGenerator } from '@nrwl/react';
import { convertNxGenerator, getProjects, Tree } from '@nrwl/devkit';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { cypressComponentTestFiles } from '@nrwl/cypress';

interface Schema {
  name: string;
  project: string;
  style: SupportedStyles;
  directory?: string;
  flat?: boolean;
  componentTest?: boolean;
}

function getDirectory(host: Tree, options: Schema) {
  const workspace = getProjects(host);
  const projectType = workspace.get(options.project).projectType;

  return options.directory
    ? options.directory
    : projectType === 'application'
    ? 'components'
    : undefined;
}

/*
 * This schematic is basically the React one, but for Next we need
 * extra dependencies for css, sass, less, styl style options.
 */
export async function componentGenerator(host: Tree, options: Schema) {
  const { componentTest, ...restOptions } = options;
  const componentInstall = await reactComponentGenerator(host, {
    ...restOptions,
    directory: getDirectory(host, options),
    pascalCaseFiles: false,
    classComponent: false,
    routing: false,
  });

  if (componentTest) {
    cypressComponentTestFiles(host, {
      ...options,
      componentType: 'next',
    });
  }

  const styledInstall = addStyleDependencies(host, options.style);

  return runTasksInSerial(styledInstall, componentInstall);
}

export default componentGenerator;
export const componentSchematic = convertNxGenerator(componentGenerator);
