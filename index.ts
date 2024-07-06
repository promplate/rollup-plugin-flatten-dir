import { type Dirent, existsSync, promises as fs } from "node:fs"
import path from "node:path"
import type { FilterPattern } from "@rollup/pluginutils"
import { createFilter, normalizePath } from "@rollup/pluginutils"
import type { Plugin } from "rollup"

/**
 * A Vite-compatible Rollup plugin that flattens a given directory into a single entry point file.
 * This plugin generates a default export, which is an object representing all the files
 * within the specified directory, allowing developers to access each file directly
 * by its relative path name.
 *
 * @param {object} [options] - The options for configuring the plugin.
 * @param {FilterPattern} [options.include] - A pattern or array of patterns that specify exactly what file paths to include.
 * @param {FilterPattern} [options.exclude] - A pattern or array of patterns that specify exactly what file paths to exclude.
 * @param {string | false | null} [options.resolve] - An optional base directory to resolve patterns against.
 *
 * @returns {Plugin} - The plugin instance.
 */
export default (options: {
  /**
   * Determine which files to include.
   * If `include` is omitted or has zero length, include all files by default.
   */
  include?: FilterPattern
  /**
   * Determine which files to exclude.
   */
  exclude?: FilterPattern
  /**
   * Optionally filters the patterns against a directory other than `process.cwd()`.
   * If a `string` is specified, then the value will be used as the base directory.
   * Relative paths will be resolved against `process.cwd()` first.
   * If `false`, then the patterns will not be resolved against any directory.
   * This can be useful if you want to create a filter for virtual module names.
   */
  resolve?: false | string | null
} = {}): Plugin => {
  const { include, exclude, resolve } = options
  const filter = createFilter(include, exclude, { resolve })

  return {
    name: "flatten-dir",

    async resolveId(source, importer) {
      const dirPath = path.join(path.dirname(importer ?? ""), source)

      if (!existsSync(dirPath) || !(await fs.stat(dirPath)).isDirectory()) {
        return null
      }

      for (const ext of ["js", "cjs", "mjs", "ts", "cts", "mts"]) { // normal modules
        if (existsSync(path.join(dirPath, `index.${ext}`))) {
          return null
        }
      }

      return `\0${dirPath}?flatten-dir`
    },

    async load(id) {
      if (!id.endsWith("?flatten-dir")) {
        return null
      }

      const dirPath = id.slice(1, -12) // remove trailing '?flatten-dir' and leading '\0'

      const dirEntries: [string, Dirent[]][] = [["", await fs.readdir(dirPath, { withFileTypes: true, encoding: "utf-8" })]]

      const files: Record<string, string> = {}

      const promises: Promise<void>[] = []

      while (dirEntries.length) {
        const [parentPath, entries] = dirEntries.pop()!
        const absoluteParentPath = path.join(dirPath, parentPath)
        promises.push(...entries.map(async (entry) => {
          const filePath = path.join(absoluteParentPath, entry.name)
          const relativePath = normalizePath(path.relative(dirPath, filePath))
          if (entry.isFile() && filter(relativePath) && relativePath !== "index.d.ts") {
            this.addWatchFile(filePath)
            files[relativePath] = await fs.readFile(filePath, "utf-8")
          }
          else if (entry.isDirectory()) {
            dirEntries.push([path.join(parentPath, entry.name), await fs.readdir(path.join(absoluteParentPath, entry.name), { withFileTypes: true, encoding: "utf-8" })])
          }
        }))
        await Promise.all(promises)
        promises.length = 0
      }
      await Promise.all(promises)

      const fileContent = `export default ${JSON.stringify(files)};`

      // generate .d.ts file for this directory
      await fs.writeFile(path.join(dirPath, "index.d.ts"), `export default {} as {${Object.keys(files).sort((a, b) => a.localeCompare(b)).map(name => `\n  ${JSON.stringify(name)}: string;`).join("")}\n}`, "utf-8")

      return fileContent
    },
  }
}
