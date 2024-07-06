# Flatten Dir

This Rollup plugin exports the contents of a given directory into a `Record<string, string>` object. The property keys are the relative paths of the files, and the values are the raw contents of the files.

## Installation

To use the `flatten-dir` plugin, first install it using npm:

```sh
npm install rollup-plugin-flatten-dir # or pnpm, yarn, bun ...
```

## Usage

Add the plugin to your rollup/vite config file:

```js
import flattenDirPlugin from "rollup-plugin-flatten-dir"

export default {
  // Your other configuration options...
  plugins: [flattenDirPlugin()],
}
```

### Plugin Options

- `include`: A pattern or array of patterns that specify exactly what file paths to include. Omitted or an empty array means include all files by default.

- `exclude`: A pattern or array of patterns that specify exactly what file paths to exclude.

- `resolve`: Optional. An optional base directory to resolve patterns against. If a `string` is specified, the value will be used as the base directory. Relative paths will be resolved against `process.cwd()` first. If `false`, patterns will not be resolved against any directory.

## How it Works

The `flatten-dir` plugin works by:

1. Resolving the directory path to be flattened.
2. Reading the contents of the directory and its subdirectories.
3. Filtering files according to `include` and `exclude` patterns.
4. Creating an export object with file names as keys and their contents as values.
5. Optionally generating a `index.d.ts` TypeScript declaration file for type checking.

## Example

Given a `src/data` directory with JSON files, the plugin can be used to create a single entry file that exposes them:

```plain
src/
├── foo/
│   ├── bar/
│   │   ├── a.json
│   │   └── b.txt
│   └── c.js
```

Then `import files from "path/to/src"` will get a `files` object. This is equivalent to having an `index.js` with the following content:

```js
export default {
  "foo/bar/a.json": "{}",
  "foo/bar/b.txt": "...",
  "foo/c.js": "",
}
```
