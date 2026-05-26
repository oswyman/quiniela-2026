import { readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const srcDir = path.join(process.cwd(), "src");

async function collectEntries(dir) {
  const items = await readdir(dir, { withFileTypes: true });
  const entries = await Promise.all(
    items.map(async (item) => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) return collectEntries(fullPath);
      return item.name.endsWith(".ts") ? [fullPath] : [];
    })
  );
  return entries.flat();
}

const entryPoints = await collectEntries(srcDir);

await build({
  entryPoints,
  outbase: srcDir,
  outdir: "lib",
  platform: "node",
  target: "node20",
  format: "cjs",
  bundle: false,
  sourcemap: true,
  logLevel: "info"
});
