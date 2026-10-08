// This repository's site/ folder is BUILD OUTPUT: the site is built in the private app repo and
// published here by that repo's workflow (.github/workflows/site.yml). Don't edit it by hand;
// the next publish replaces it.
//
// This stub exists so pages.yml's `node site/build.mjs _site` step keeps working: it copies the
// finished site as it is (CNAME is already part of it).
import { cpSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const src = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || "_site";
rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true, filter: (p) => !/[\\/](build\.mjs|tools)$/.test(p) });
console.log(`copied the built site to ${out}`);
