import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
import terser from '@rollup/plugin-terser';
import { deleteAsync } from 'del';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const name = process.env.npm_package_name;

export default async function () {
  await deleteAsync(['build']);
  
  const builds = [];

  // Main
  builds.push({
    plugins: [typescript(), nodeResolve()],
    input: ['src/index.ts'],
    output: [
      {
        dir: 'build/',
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
      {
        dir: 'build/',
        format: 'cjs',
        entryFileNames: '[name].cjs',
        chunkFileNames: '[name].cjs',
      },
    ],
  });

  // Minified iife
  builds.push({
    input: 'build/index.js',
    plugins: [
      terser({
        compress: { ecma: 2021 },
      }),
    ],
    output: {
      file: 'build/umd.js',
      format: 'umd',
      esModule: false,
      name: `${name}`,
    },
  });

  // types
  builds.push({
    input: "./build/.ts-tmp/src/index.d.ts",
    output: [{ file: `build/${name}.d.ts`, format: "es" }],
    plugins: [
      dts(), 
      {
        name: 'delete', 
        generateBundle() {
          deleteAsync(['.rollup.cache', 'build/.ts-tmp']);
        }
      },
    ],
  });
  
  return builds;
}

