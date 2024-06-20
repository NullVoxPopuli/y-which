#!/usr/bin/env node

import assert from 'node:assert';

import { Utils } from './pkg.js';

const [, , ...args] = process.argv;
const depName = args[0];

assert(depName, 'You must provide a dependency name');

const resolveFrom = process.cwd();

let utils = new Utils({ resolveFrom });

let pathOfDep =
  /**
   * require.resolve of the '.' export (or main)
   * for `depName`, wrapped in a try-catch
   *
   * (so folks don't think this tool is broken when
   *  it can't find a dependency)
   */
  (await utils.tryResolveMain({ depName })) ||
  /**
   * Same as above, but tries to resolve the package.json.
   *
   * This will only work if the package either:
   * - doesn't define exports
   * - exports explicitly declare the package.json
   * - exports define a very generous glob that
   *   happens to include the package.json
   */
  (await utils.tryResolvePackage({ depName }));

/**
 ***************************************
 * Everything below here is just output.
 * Resolving is done (above).
 ***************************************
 */

if (!pathOfDep) {
  console.info(
    `
  Could not find ${depName}

  Tried require.resolve of ${depName} using:
    - the default entrypoint ('.' or main)
    - the package.json
  
  from: ${resolveFrom}

  To spot check, run:

    node -e "console.log(require.resolve('${depName}'))"
  `
  );
  process.exit(1);
}

let version = await utils.versionAt({ pathOfDep: pathOfDep });

let versionString = version ? `which is @ ${version}` : '';
let self = await utils.getSelfManifest();

console.info(
  `
  Node resolves ${depName} 
       to   ${pathOfDep}
       ${versionString}

     from   ${self.name} @ ${self.version} 
       at   ${process.cwd()}
`.replaceAll(process.env.HOME, `~`)
);
