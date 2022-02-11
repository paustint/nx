import { libraryGenerator as reactLibraryGenerator } from '@nrwl/react';
import { nextInitGenerator } from '../init/init';
import {
  convertNxGenerator,
  GeneratorCallback,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import { Schema } from './schema';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import {
  cypressComponentProject,
  cypressComponentTestFiles,
} from '@nrwl/cypress';

export async function libraryGenerator(host: Tree, options: Schema) {
  const name = names(options.name).fileName;
  const tasks: GeneratorCallback[] = [];
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;

  const { libsDir } = getWorkspaceLayout(host);
  const projectRoot = joinPathFragments(libsDir, projectDirectory);
  const initTask = await nextInitGenerator(host, {
    ...options,
    skipFormat: true,
  });
  tasks.push(initTask);

  // prevent the React lib generator from making cypress component tests
  // as we need to make a next version not react
  const { addCypress, ...restOptions } = options;

  const libTask = await reactLibraryGenerator(host, restOptions);
  tasks.push(libTask);

  // TODO(caleb): test this
  if (addCypress) {
    const cypressTask = await cypressComponentProject(host, {
      project: options.name,
      componentType: 'next',
      compiler: 'babel',
    });
    tasks.push(cypressTask);

    cypressComponentTestFiles(host, {
      componentType: 'next',
      project: options.name,
      name: options.name,
      directory: options.directory,
    });
  }

  updateJson(host, joinPathFragments(projectRoot, '.babelrc'), (json) => {
    if (options.style === '@emotion/styled') {
      json.presets = [
        [
          '@nrwl/next/babel',
          {
            'preset-react': {
              runtime: 'automatic',
              importSource: '@emotion/react',
            },
          },
        ],
      ];
    } else if (options.style === 'styled-jsx') {
      // next.js doesn't require the `styled-jsx/babel' plugin as it is already
      // built-into the `next/babel` preset
      json.presets = ['@nrwl/next/babel'];
      json.plugins = (json.plugins || []).filter(
        (x) => x !== 'styled-jsx/babel'
      );
    } else {
      json.presets = ['@nrwl/next/babel'];
    }
    return json;
  });

  updateJson(host, joinPathFragments(projectRoot, 'tsconfig.json'), (json) => {
    if (options.style === '@emotion/styled') {
      json.compilerOptions.jsxImportSource = '@emotion/react';
    }
    return json;
  });

  updateJson(
    host,
    joinPathFragments(projectRoot, 'tsconfig.lib.json'),
    (json) => {
      if (!json.files) {
        json.files = [];
      }
      json.files = json.files.map((path: string) => {
        if (path.endsWith('react/typings/image.d.ts')) {
          return path.replace(
            '@nrwl/react/typings/image.d.ts',
            '@nrwl/next/typings/image.d.ts'
          );
        }
        return path;
      });
      return json;
    }
  );

  return runTasksInSerial(...tasks);
}

export default libraryGenerator;
export const librarySchematic = convertNxGenerator(libraryGenerator);
