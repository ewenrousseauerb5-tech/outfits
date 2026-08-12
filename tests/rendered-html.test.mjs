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

  assert.match(page, /Tu armario convertido en sistema/);
  assert.match(page, /Parte de arriba/);
  assert.match(page, /Parte de abajo/);
  assert.match(page, /Zapatos/);
  assert.match(page, /Output/);
  assert.match(page, /Input/);
  assert.match(page, /Importa por fotos o links/);
  assert.match(page, /Enlaces de tienda/);
  assert.match(page, /MannequinViewer/);
  assert.match(page, /Maniqui 3D interactivo/);
  assert.doesNotMatch(page, /outerwear|accessory|Capa|Accesorio/);
  assert.doesNotMatch(page, /Notas de estilo|Catalogo de tres piezas|Moodboard|Referencias visuales/);
  assert.match(page, /readImages/);
  assert.match(page, /createImportedGarment/);
  assert.match(page, /productUrl/);
  assert.match(packageJson, /"three"/);
  assert.match(layout, /lang="es"/);
  assert.match(packageJson, /"build": "next build --webpack"/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|next\/font\/google/);
  assert.doesNotMatch(packageJson, /vinext build/);
});
