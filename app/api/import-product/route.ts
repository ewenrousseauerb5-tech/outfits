import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_CANDIDATES = 18;
const MAX_JSON_PRODUCTS = 40;

const currencySymbols: Record<string, string> = {
  "€": "EUR",
  "$": "USD",
  "£": "GBP",
};

const hostBrands: Array<[RegExp, string]> = [
  [/massimodutti/i, "Massimo Dutti"],
  [/zara/i, "Zara"],
  [/pullandbear/i, "Pull&Bear"],
  [/bershka/i, "Bershka"],
  [/stradivarius/i, "Stradivarius"],
  [/oysho/i, "Oysho"],
];

type Category = "top" | "bottom" | "shoes";

function cleanText(value?: string | null) {
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asText(value: unknown) {
  if (typeof value === "string") return cleanText(value);
  if (typeof value === "number") return String(value);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function pickMeta(html: string, names: string[]) {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${name}["'][^>]*>`,
      "i",
    );
    const match = html.match(pattern);
    const value = cleanText(match?.[1] ?? match?.[2]);
    if (value) return value;
  }

  return undefined;
}

function pickAllMeta(html: string, names: string[]) {
  const values: string[] = [];
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${name}["'][^>]*>`,
      "gi",
    );

    for (const match of html.matchAll(pattern)) {
      const value = cleanText(match[1] ?? match[2]);
      if (value) values.push(value);
    }
  }

  return values;
}

function pickTitle(html: string) {
  return cleanText(
    pickMeta(html, ["og:title", "twitter:title", "title", "name"])
      ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
  );
}

function brandFromHost(host: string) {
  return hostBrands.find(([pattern]) => pattern.test(host))?.[1];
}

function titleFromUrl(productUrl: URL) {
  const parts = productUrl.pathname.split("/").filter(Boolean);
  const slug =
    [...parts].reverse().find((part) => /^.+-l\d+/i.test(part))
    ?? parts.at(-1)
    ?? productUrl.hostname;

  const title = decodeURIComponent(slug)
    .replace(/^.*\/|[?#].*$/g, "")
    .replace(/-l\d+.*/i, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanText(title.replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

function isBlockedPage(html: string) {
  return /access denied|errors\.edgesuite\.net|akamai/i.test(html);
}

function fallbackProductImage(title: string | undefined, brand: string | undefined, category: Category | undefined) {
  const label = cleanText(title) || "Prenda importada";
  const brandLabel = cleanText(brand) || "Tienda";
  const shape =
    category === "top"
      ? `<path d="M215 122 166 92l-50 44 34 44 23-18v166h214V162l23 18 34-44-50-44-49 30c-22 13-62 13-84 0Z" fill="#e8edf2"/><path d="M173 162h214v166H173z" fill="#f8fbff" opacity=".14"/>`
      : category === "shoes"
        ? `<path d="M117 248c62 30 112 37 188 25 39-6 86 6 112 33 8 8 5 24-7 28H108c-22 0-34-27-18-43l27-43Z" fill="#e8edf2"/><path d="M116 304h304" stroke="#111827" stroke-width="12" opacity=".28"/>`
        : `<path d="M183 100h178l18 260H274l-2-176h-12l-32 176H123l60-260Z" fill="#e8edf2"/><path d="M183 100h178l8 54H171l12-54Z" fill="#f8fbff" opacity=".18"/>`;
  const safeLabel = label.replace(/[<>&]/g, "");
  const safeBrand = brandLabel.replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#101827"/><stop offset="1" stop-color="#05070a"/></linearGradient></defs><rect width="640" height="800" fill="url(#g)"/><circle cx="512" cy="122" r="96" fill="#62e7ff" opacity=".14"/><g transform="translate(82 132)">${shape}</g><text x="48" y="652" fill="#f4f7fb" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="800">${safeLabel.slice(0, 28)}</text><text x="48" y="704" fill="#8c96a7" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700">${safeBrand.slice(0, 26)}</text></svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function normalizeImage(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.map(normalizeImage).find(Boolean);
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;

  const url = value.url ?? value.src ?? value.originalSrc ?? value.previewImage;
  return normalizeImage(url);
}

function normalizeImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const image = normalizeImage(item);
      return image ? [image] : [];
    });
  }

  const image = normalizeImage(value);
  return image ? [image] : [];
}

function parseJson(value: string) {
  try {
    return JSON.parse(value.trim());
  } catch {
    return undefined;
  }
}

function jsonLdEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdEntries);
  if (!isRecord(value)) return [];

  const graph = value["@graph"];
  return Array.isArray(graph) ? graph.flatMap(jsonLdEntries) : [value];
}

function isProductType(value: unknown) {
  const types = Array.isArray(value) ? value : [value];
  return types.some((type) => String(type).toLowerCase().includes("product"));
}

function readJsonLdProducts(html: string) {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const products: Array<Record<string, unknown>> = [];

  for (const script of scripts) {
    const parsed = parseJson(script[1]);
    for (const entry of jsonLdEntries(parsed)) {
      if (isRecord(entry) && isProductType(entry["@type"])) products.push(entry);
    }
  }

  return products;
}

function looksLikeProductRecord(value: Record<string, unknown>) {
  const keys = Object.keys(value).map((key) => key.toLowerCase());
  const hasIdentity = ["name", "title", "productname", "product_name"].some((key) =>
    typeof value[key] === "string" || keys.includes(key),
  );
  const hasCommerceData = keys.some((key) =>
    /image|media|gallery|offer|price|brand|sku|variant|product/.test(key),
  );

  return hasIdentity && hasCommerceData;
}

function collectProductRecords(value: unknown, products: Array<Record<string, unknown>>, depth = 0) {
  if (products.length >= MAX_JSON_PRODUCTS || depth > 9) return;

  if (Array.isArray(value)) {
    for (const item of value) collectProductRecords(item, products, depth + 1);
    return;
  }

  if (!isRecord(value)) return;
  if (looksLikeProductRecord(value)) products.push(value);

  for (const item of Object.values(value)) collectProductRecords(item, products, depth + 1);
}

function readJsonScriptProducts(html: string) {
  const scripts = html.matchAll(
    /<script(?=[^>]*(?:type=["']application\/json["']|id=["']__NEXT_DATA__["']))[^>]*>([\s\S]*?)<\/script>/gi,
  );
  const products: Array<Record<string, unknown>> = [];

  for (const script of scripts) {
    collectProductRecords(parseJson(script[1]), products);
  }

  return products;
}

function titleFromProduct(product: Record<string, unknown>) {
  return (
    asText(product.name)
    ?? asText(product.title)
    ?? asText(product.productName)
    ?? asText(product.product_name)
  );
}

function brandFromProduct(product: Record<string, unknown>) {
  const brand = product.brand ?? product.vendor ?? product.manufacturer;
  if (typeof brand === "string") return cleanText(brand);
  if (isRecord(brand)) return asText(brand.name);
  return undefined;
}

function colorFromProduct(product: Record<string, unknown>) {
  return asText(product.color) ?? asText(product.colour) ?? asText(product.selectedColor);
}

function descriptionFromProduct(product: Record<string, unknown>) {
  return (
    asText(product.description)
    ?? asText(product.shortDescription)
    ?? asText(product.short_description)
    ?? asText(product.summary)
  );
}

function skuFromProduct(product: Record<string, unknown>) {
  return asText(product.sku) ?? asText(product.mpn) ?? asText(product.id) ?? asText(product.productId);
}

function offerObjects(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(offerObjects);
  if (isRecord(value)) return [value];
  return [];
}

function priceFromValue(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return cleanText(value);
  if (!isRecord(value)) return undefined;

  return (
    priceFromValue(value.price)
    ?? priceFromValue(value.amount)
    ?? priceFromValue(value.value)
    ?? priceFromValue(value.minPrice)
    ?? priceFromValue(value.salePrice)
    ?? priceFromValue(value.currentPrice)
  );
}

function offerDataFromProduct(product: Record<string, unknown>) {
  const offers = offerObjects(product.offers);
  const directPrice = priceFromValue(product.price ?? product.priceRange ?? product.pricing);
  const offer = offers[0];

  return {
    price: directPrice ?? priceFromValue(offer?.price ?? offer?.lowPrice ?? offer?.amount),
    currency:
      asText(offer?.priceCurrency)
      ?? asText(offer?.currency)
      ?? asText(product.priceCurrency)
      ?? asText(product.currency)
      ?? asText(isRecord(product.price) ? product.price.currencyCode : undefined),
    availability: asText(offer?.availability ?? product.availability),
  };
}

function collectImageValues(value: unknown, output: string[] = [], depth = 0) {
  if (output.length >= MAX_IMAGE_CANDIDATES * 3 || depth > 7) return output;

  if (typeof value === "string") {
    if (looksLikeProductImage(value)) output.push(value);
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectImageValues(item, output, depth + 1);
    return output;
  }

  if (!isRecord(value)) return output;

  for (const [key, item] of Object.entries(value)) {
    if (/image|img|src|url|media|gallery|photo|picture/i.test(key)) {
      const direct = normalizeImage(item);
      if (direct) output.push(direct);
      collectImageValues(item, output, depth + 1);
    }
  }

  return output;
}

function productData(products: Array<Record<string, unknown>>) {
  const title = products.map(titleFromProduct).find(Boolean);
  const brand = products.map(brandFromProduct).find(Boolean);
  const color = products.map(colorFromProduct).find(Boolean);
  const description = products.map(descriptionFromProduct).find(Boolean);
  const sku = products.map(skuFromProduct).find(Boolean);
  const offer = products.map(offerDataFromProduct).find((item) => item.price || item.currency);
  const images = products.flatMap((product) => [
    ...normalizeImages(product.image),
    ...normalizeImages(product.images),
    ...normalizeImages(product.media),
    ...normalizeImages(product.gallery),
    ...collectImageValues(product),
  ]);

  return {
    title,
    brand,
    color,
    description,
    sku,
    price: offer?.price,
    currency: offer?.currency,
    availability: offer?.availability,
    images,
  };
}

function absolutize(url: string, baseUrl: string) {
  try {
    const normalized = url
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&")
      .trim();
    if (!normalized || normalized.startsWith("data:")) return normalized;
    if (normalized.startsWith("//")) return `https:${normalized}`;
    return new URL(normalized, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function srcsetUrls(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function looksLikeProductImage(url: string) {
  const normalized = url.toLowerCase();
  if (/logo|icon|sprite|favicon|placeholder|transparent|blank|loader/.test(normalized)) {
    return false;
  }

  return (
    /\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/i.test(normalized)
    || /image|img|photo|picture|product|media|cdn|static|assets|merce|fotos|images/.test(normalized)
  );
}

function extractEmbeddedImageUrls(html: string) {
  const values: string[] = [];
  const attrPattern =
    /<(?:img|source)[^>]+(?:src|data-src|data-original|data-zoom-image|content)=["']([^"']+)["'][^>]*>|<(?:img|source)[^>]+srcset=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(attrPattern)) {
    const direct = match[1];
    const srcset = match[2];
    if (direct) values.push(direct);
    if (srcset) values.push(...srcsetUrls(srcset));
  }

  const scriptUrlPattern =
    /https?:\\?\/\\?\/[^"'\\\s]+?(?:\.(?:avif|webp|png|jpe?g|gif|svg)(?:\?[^"'\\\s]*)?|\/(?:image|images|media|product|products|fotos?|photo|pictures)\/[^"'\\\s]+)/gi;
  for (const match of html.matchAll(scriptUrlPattern)) {
    values.push(match[0]);
  }

  return values;
}

function readableProxyUrl(url: string) {
  return `https://r.jina.ai/http://r.jina.ai/http://${url}`;
}

function extractMarkdownImageUrls(markdown: string) {
  const values: string[] = [];
  const imagePattern = /!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi;
  const directPattern = /https?:\/\/[^\s)]+?\.(?:avif|webp|png|jpe?g|gif)(?:\?[^\s)]*)?/gi;

  for (const match of markdown.matchAll(imagePattern)) values.push(match[1]);
  for (const match of markdown.matchAll(directPattern)) values.push(match[0]);

  return values;
}

async function readReadableFallback(url: string) {
  try {
    const response = await fetch(readableProxyUrl(url), {
      headers: {
        accept: "text/plain,text/markdown,*/*",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
      },
    });
    if (!response.ok) return undefined;

    const markdown = await response.text();
    if (/access denied/i.test(markdown) && !/!\[/.test(markdown)) return undefined;

    return {
      title: cleanText(markdown.match(/^Title:\s*(.+)$/im)?.[1]),
      images: extractMarkdownImageUrls(markdown),
    };
  } catch {
    return undefined;
  }
}

function uniqueImages(values: Array<string | undefined>, baseUrl: string) {
  const seen = new Set<string>();
  return values
    .flatMap((value) => (value ? [value] : []))
    .map((value) => absolutize(value, baseUrl))
    .filter((value): value is string => Boolean(value))
    .filter(looksLikeProductImage)
    .filter((value) => {
      const key = value.replace(/([?&])(width|height|w|h|format|quality|q)=\d+/gi, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_IMAGE_CANDIDATES);
}

function extractMoney(html: string) {
  const metaPrice = pickMeta(html, [
    "product:price:amount",
    "og:price:amount",
    "twitter:data1",
    "price",
  ]);
  const metaCurrency = pickMeta(html, [
    "product:price:currency",
    "og:price:currency",
    "priceCurrency",
    "currency",
  ]);

  if (metaPrice) {
    return {
      price: metaPrice.replace(/[^\d.,]/g, "") || metaPrice,
      currency: metaCurrency,
    };
  }

  const match =
    html.match(/([€$£])\s?(\d{1,5}(?:[.,]\d{2})?)/)
    ?? html.match(/(\d{1,5}(?:[.,]\d{2})?)\s?(€|EUR|USD|GBP)/i);

  if (!match) return {};

  const firstIsSymbol = Boolean(currencySymbols[match[1]]);
  return {
    price: firstIsSymbol ? match[2] : match[1],
    currency: firstIsSymbol ? currencySymbols[match[1]] : match[2].toUpperCase(),
  };
}

async function imageToDataUrl(imageUrl: string | undefined, referer: string) {
  if (!imageUrl) return undefined;
  if (imageUrl.startsWith("data:")) return imageUrl;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer,
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
      },
    });
    if (!response.ok) return undefined;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return undefined;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) return undefined;

    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return undefined;
  }
}

async function readDirectImage(url: string) {
  try {
    const dataUrl = await imageToDataUrl(url, url);
    return dataUrl ? [dataUrl] : [];
  } catch {
    return [];
  }
}

async function resolveImages(candidates: string[], referer: string) {
  const resolved: string[] = [];

  for (const candidate of candidates) {
    const dataUrl = await imageToDataUrl(candidate, referer);
    if (dataUrl) {
      resolved.push(dataUrl);
    } else {
      resolved.push(candidate);
    }

    if (resolved.some((image) => image.startsWith("data:image"))) break;
  }

  return resolved.length ? resolved : candidates.slice(0, 1);
}

function confidence(fields: string[], imageCount: number) {
  const strongFields = fields.filter((field) =>
    ["title", "image", "price", "brand", "description"].includes(field),
  ).length;

  if (strongFields >= 4 && imageCount > 0) return "high";
  if (strongFields >= 2 || imageCount > 1) return "medium";
  return "low";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { url?: string; category?: Category } | null;
  const url = body?.url?.trim();
  const category = body?.category;

  if (!url) {
    return NextResponse.json({ ok: false, error: "Missing url" }, { status: 400 });
  }

  let productUrl: URL;
  try {
    productUrl = new URL(url);
    if (!["http:", "https:"].includes(productUrl.protocol)) throw new Error("Invalid protocol");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid url" }, { status: 400 });
  }

  try {
    if (/\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/i.test(productUrl.pathname)) {
      const images = await readDirectImage(productUrl.toString());
      if (images.length) {
        return NextResponse.json({
          ok: true,
          title: titleFromUrl(productUrl),
          sourceHost: productUrl.hostname.replace(/^www\./, ""),
          confidence: "high",
          fields: ["title", "image"],
          image: images[0],
          images,
          imageCandidates: [productUrl.toString()],
        });
      }
    }

    const response = await fetch(productUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "es-ES,es;q=0.9,en;q=0.8",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: `Fetch failed: ${response.status}` });
    }

    const html = await response.text();
    const baseUrl = response.url || productUrl.toString();
    const sourceHost = productUrl.hostname.replace(/^www\./, "");

    if (isBlockedPage(html)) {
      const fallbackTitle = titleFromUrl(productUrl);
      const fallbackBrand = brandFromHost(sourceHost);
      const readable = await readReadableFallback(productUrl.toString());
      const readableCandidates = uniqueImages(readable?.images ?? [], productUrl.toString());
      const readableImages = await resolveImages(readableCandidates, productUrl.toString());
      const fallbackImage = fallbackProductImage(fallbackTitle, fallbackBrand, category);
      const finalImages = readableImages.length ? readableImages : [fallbackImage];

      return NextResponse.json({
        ok: true,
        title: readable?.title && !/massimo dutti$/i.test(readable.title) ? readable.title : fallbackTitle,
        brand: fallbackBrand,
        sourceHost,
        confidence: readableImages.length ? "high" : "medium",
        fields: ["title", fallbackBrand && "brand", "image"].filter(Boolean),
        image: finalImages[0],
        images: finalImages,
        imageCandidates: readableCandidates,
        error: readableImages.length
          ? undefined
          : "La tienda bloqueo la foto real; se creo un visual temporal para que la prenda aparezca.",
      });
    }

    const products = [...readJsonLdProducts(html), ...readJsonScriptProducts(html)];
    const data = productData(products);
    const money = extractMoney(html);

    const parsedTitle = data.title || pickTitle(html);
    const title = parsedTitle && !/^access denied$/i.test(parsedTitle)
      ? parsedTitle
      : titleFromUrl(productUrl);
    const brand =
      data.brand
      || pickMeta(html, ["product:brand", "og:brand", "brand", "manufacturer", "twitter:label1"])
      || brandFromHost(sourceHost);
    const description =
      data.description || pickMeta(html, ["og:description", "twitter:description", "description"]);
    const price = data.price || money.price;
    const currency = data.currency || money.currency;
    const availability =
      data.availability || pickMeta(html, ["product:availability", "availability"]);
    const color = data.color || pickMeta(html, ["product:color", "color"]);
    const sku = data.sku || pickMeta(html, ["product:retailer_item_id", "sku", "mpn"]);

    const imageCandidates = uniqueImages(
      [
        ...data.images,
        ...pickAllMeta(html, [
          "og:image:secure_url",
          "og:image",
          "twitter:image",
          "image",
          "thumbnail",
        ]),
        ...extractEmbeddedImageUrls(html),
      ],
      baseUrl,
    );
    const readable = imageCandidates.length ? undefined : await readReadableFallback(productUrl.toString());
    const readableCandidates = uniqueImages(readable?.images ?? [], baseUrl);
    const realImageCandidates = imageCandidates.length ? imageCandidates : readableCandidates;
    const images = await resolveImages(realImageCandidates, baseUrl);
    const fallbackImage = fallbackProductImage(title, brand, category);
    const finalImages = images.length ? images : [fallbackImage];
    const image = finalImages[0];

    const fields = [
      title && "title",
      brand && "brand",
      description && "description",
      price && "price",
      currency && "currency",
      availability && "availability",
      color && "color",
      sku && "sku",
      (realImageCandidates.length || fallbackImage) && "image",
    ].filter(Boolean) as string[];

    return NextResponse.json({
      ok: true,
      title,
      brand,
      description,
      price,
      currency,
      availability,
      color,
      sku,
      sourceHost,
      confidence: confidence(fields, realImageCandidates.length),
      fields,
      image,
      images: finalImages,
      imageSource: realImageCandidates[0],
      imageCandidates: realImageCandidates,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown import error",
    });
  }
}
