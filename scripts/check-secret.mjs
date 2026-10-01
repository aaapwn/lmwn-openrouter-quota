// Fails if the API key (or anything key-shaped) ended up in the build output,
// or if an API route / NEXT_PUBLIC key slipped into the source. Prints no secret.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const key = process.env.OPENROUTER_API_KEY ?? "";
let bad = 0;
const fail = (m) => { bad++; console.error("FAIL:", m); };

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}

if (!existsSync(".next")) fail("run `npm run build` first");
for (const f of walk(".next")) {
  if (/\.(map|nft\.json)$/.test(f) || f.includes("/cache/")) continue;
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  if (key && text.includes(key)) fail(`key value found in ${f}`);
  if (/sk-or-v1-[A-Za-z0-9]{8,}/.test(text)) fail(`key-shaped string in ${f}`);
}
if (!key) console.warn("note: OPENROUTER_API_KEY not set, only key-shaped strings were checked");

if (existsSync("src/app/api") || existsSync("pages/api")) fail("an API route exists");
for (const f of walk("src")) {
  const t = readFileSync(f, "utf8");
  if (/NEXT_PUBLIC_[A-Z_]*(KEY|TOKEN|SECRET)/.test(t)) fail(`public env var for a secret in ${f}`);
  if (/openrouter\.ai/.test(t) && !f.endsWith("src/lib/openrouter.ts")) fail(`OpenRouter URL outside the server module: ${f}`);
}
if (bad) process.exit(1);
console.log("ok: no key in the build, no API route, OpenRouter is only referenced in src/lib/openrouter.ts");
