import * as fs from "fs";
import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';
import preactRefresh from '@prefresh/vite'
import commonjs from '@rollup/plugin-commonjs';

const APP_FQDN = process.env.APP_FQDN || "metaframe1.dev";
const APP_PORT = process.env.APP_PORT || "443";
const DOCS_SUB_DIR = process.env.DOCS_SUB_DIR;
console.log('DOCS_SUB_DIR', DOCS_SUB_DIR);

const fileKey = `./.certs/${APP_FQDN}-key.pem`;
const fileCert = `./.certs/${APP_FQDN}.pem`;

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  base: DOCS_SUB_DIR && DOCS_SUB_DIR !== "" ? `/${DOCS_SUB_DIR}/` : undefined,
  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      "react-dom/test-utils": "preact/test-utils",
    },
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  plugins: [
    preactRefresh(),
    typescript({ outDir: `docs/${DOCS_SUB_DIR}`, sourceMap: true, inlineSources: mode !== 'production' }),
    // commonjs(),
  ],
  build: {
    outDir: `docs/${DOCS_SUB_DIR}`, //mode === "production" ? "dist" : "build",
    target: 'esnext',
    sourcemap: true,
    minify: mode === 'development' ? false : 'esbuild',
    emptyOutDir: false,
  },
  server: {
    open: '/',
    host: APP_FQDN,
    port: parseInt(fs.existsSync(fileKey) ? APP_PORT : "8000"),
    https: fs.existsSync(fileKey) && fs.existsSync(fileCert) ? {
      key: fs.readFileSync(fileKey),
      cert: fs.readFileSync(fileCert),
    } : undefined,
  }
}));
