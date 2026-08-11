import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("build creates the Next.js output Vercel expects", async () => {
  await access(new URL("../.next/BUILD_ID", import.meta.url));
});

test("the outfit app source contains the primary product experience", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Outfits bonitos con la ropa que ya tienes/);
  assert.match(page, /Maniqui y prendas puestas/);
  assert.match(page, /Fotos de la prenda/);
  assert.match(page, /Enlace de la prenda/);
  assert.match(page, /readImages/);
  assert.match(page, /productUrl/);
  assert.match(page, /sourceUrl/);
  assert.match(layout, /lang="es"/);
  assert.match(packageJson, /"build": "next build --webpack"/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|next\/font\/google/);
  assert.doesNotMatch(packageJson, /vinext build/);
});
