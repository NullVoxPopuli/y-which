import fs from 'node:fs/promises';
import { findUp } from 'find-up';
import module from 'node:module';
import path from 'node:path';

const require = module.createRequire(import.meta.url);

export class Utils {
  constructor({ resolveFrom }) {
    this.resolveFrom = resolveFrom;
  }

  #manifest;
  async getSelfManifest() {
    if (this.#manifest) {
      return this.#manifest;
    }

    let manifestPath = await findUp('package.json', {
      cwd: this.resolveFrom,
    });

    if (!manifestPath) return;

    let file = await fs.readFile(manifestPath);
    let manifest = JSON.parse(file.toString());

    return (this.#manifest = manifest);
  }

  async versionAt({ pathOfDep }) {
    let self = await this.getSelfManifest();
    let manifestPath = await findUp('package.json', {
      cwd: pathOfDep,
      stopAt: this.resolveFrom,
    });

    if (!manifestPath) return;

    let file = await fs.readFile(manifestPath);
    let manifest = JSON.parse(file.toString());

    if (self.name === manifest.name) {
      // We accidentally resolved the CWD's package.json
      return;
    }

    return manifest.version;
  }

  /**
   * At this point, we already have the answer.
   * The whole point this tool exists is to print the value
   *   of this variable.
   *
   * Everything else in this file is to help with certainty
   * around the meaning of this value, reducing potential
   * ambiguity.
   */
  async tryResolveMain({ depName }) {
    try {
      const pathOfDep = require.resolve(depName, {
        paths: [this.resolveFrom],
      });

      return pathOfDep;
    } catch (e) {
      if (isModuleNotFoundError(e, depName)) {
        return;
      }

      throw e;
    }
  }

  async tryResolvePackage({ depName }) {
    let request = path.join(depName, 'package.json');

    try {
      const pathOfDep = require.resolve(request, {
        paths: [this.resolveFrom],
      });

      return pathOfDep;
    } catch (e) {
      if (isModuleNotFoundError(e, request)) {
        return;
      }

      throw e;
    }
  }
}

/**
 * Example e.message:
 *
 * Cannot find module 'find-up2'
 * Require stack:
 * - /home/nvp/Development/NullVoxPopuli/node-which/pkg.js
 */
function isModuleNotFoundError(e, request) {
  let ignoredMessage = `Cannot find module '${request}'`;

  if (e instanceof Error) {
    let lines = e.message.split('\n');
    let mainMessage = lines[0];
    if (mainMessage === ignoredMessage) {
      return true;
    }
  }
}
