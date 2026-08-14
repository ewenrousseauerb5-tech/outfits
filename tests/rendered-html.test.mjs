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
  const importRoute = await readFile(
    new URL("../app/api/import-product/route.ts", import.meta.url),
    "utf8",
  );

  assert.match(page, /Tu armario convertido en sistema/);
  assert.match(page, /Parte de arriba/);
  assert.match(page, /Parte de abajo/);
  assert.match(page, /Zapatos/);
  assert.match(page, /Output/);
  assert.match(page, /Input/);
  assert.match(page, /Importa por fotos o links/);
  assert.match(page, /Enlaces de tienda/);
  assert.match(page, /OutfitBoard/);
  assert.match(page, /Composicion del outfit/);
  assert.match(page, /floating-callout/);
  assert.match(page, /callout-line/);
  assert.doesNotMatch(page, /MannequinViewer|Maniqui 3D interactivo|THREE|three/);
  assert.doesNotMatch(page, /outerwear|accessory|Capa|Accesorio/);
  assert.doesNotMatch(page, /Notas de estilo|Catalogo de tres piezas|Moodboard|Referencias visuales/);
  assert.match(page, /readImages/);
  assert.match(page, /createImportedGarment/);
  assert.match(page, /importProductLink/);
  assert.match(page, /\/api\/import-product/);
  assert.match(page, /productUrl/);
  assert.match(page, /brand/);
  assert.match(page, /price/);
  assert.match(page, /importConfidence/);
  assert.doesNotMatch(packageJson, /"three"|"@types\/three"/);
  assert.match(importRoute, /og:image/);
  assert.match(importRoute, /srcset/);
  assert.match(importRoute, /extractEmbeddedImageUrls/);
  assert.match(importRoute, /imageCandidates/);
  assert.match(importRoute, /ld\\\+json/);
  assert.match(importRoute, /readJsonScriptProducts/);
  assert.match(importRoute, /__NEXT_DATA__/);
  assert.match(importRoute, /product:price:amount/);
  assert.match(importRoute, /product:brand/);
  assert.match(importRoute, /confidence/);
  assert.match(importRoute, /isBlockedPage/);
  assert.match(importRoute, /Massimo Dutti/);
  assert.match(importRoute, /titleFromUrl/);
  assert.match(importRoute, /fallbackProductImage/);
  assert.match(importRoute, /readReadableFallback/);
  assert.match(importRoute, /extractMarkdownImageUrls/);
  assert.match(importRoute, /data:\$\{contentType\};base64/);
  assert.match(importRoute, /data:image\/svg\+xml;base64/);
  assert.match(layout, /lang="es"/);
  assert.match(packageJson, /"build": "next build --webpack"/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|next\/font\/google/);
  assert.doesNotMatch(packageJson, /vinext build/);
});
