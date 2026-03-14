// See: https://rollupjs.org/introduction/

import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sharedPlugins = () => [typescript(), nodeResolve({ preferBuiltins: true }), commonjs(), json()];

const config = [
  {
    input: "src/setup-redis.ts",
    output: {
      esModule: true,
      file: "dist/setup-redis.js",
      format: "es",
      inlineDynamicImports: true,
      sourcemap: true,
    },
    plugins: sharedPlugins(),
  },
  {
    input: "src/cleanup-redis.ts",
    output: {
      esModule: true,
      file: "dist/cleanup-redis.js",
      format: "es",
      inlineDynamicImports: true,
      sourcemap: true,
    },
    plugins: sharedPlugins(),
  },
];

export default config;
