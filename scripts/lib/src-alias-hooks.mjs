/**
 * Lets plain `node` scripts import app modules through the "@/…" alias (tsconfig paths), so a
 * script can reuse the exact zod schemas the CMS uses instead of copying them. Import this module
 * first, then load "@/…" modules with a dynamic `await import()`. Static imports resolve before
 * this hook is registered.
 *
 * "@/lib/x" → src/lib/x.ts, x.tsx, x/index.ts (first that exists). Everything else falls through.
 */
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { repoRoot } from "./dev-env.mjs";

// The app's package.json has no "type"; Node re-parses src/*.ts as ESM and warns once per file.
process.removeAllListeners("warning");

const srcRoot = join(repoRoot, "src");
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function withExtension(base) {
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const url = withExtension(join(srcRoot, specifier.slice(2)));
      if (url) return nextResolve(url, context);
    }
    // Extension-less relative imports inside src/ (bundler-style), e.g. "./slug".
    if (specifier.startsWith(".") && !extname(specifier) && context.parentURL?.startsWith("file:")) {
      const parent = fileURLToPath(context.parentURL);
      if (parent.startsWith(srcRoot)) {
        const url = withExtension(join(parent, "..", specifier));
        if (url) return nextResolve(url, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
