import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_CANDIDATES = 12;

function cleanText(value?: string | null) {
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMeta(html: string, names: string[]) {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
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
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`,
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
    pickMeta(html, ["og:title", "twitter:title"])
      ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
  );
}

function normalizeImage(value: unknown) {
  if (Array.isArray(value)) return value.find((item) => typeof item === "string");
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "url" in value) {
    const maybeUrl = (value as { url?: unknown }).url;
    return typeof maybeUrl === "string" ? maybeUrl : undefined;
  }

  return undefined;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function readJsonLd(html: string) {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const products: Array<Record<string, unknown>> = [];

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1].trim());
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        if (!isRecord(entry)) continue;
        const graphValue = entry["@graph"];
        const graph = Array.isArray(graphValue) ? graphValue : [entry];
        for (const item of graph) {
          if (!isRecord(item)) continue;
          const type = item["@type"];
          const types = Array.isArray(type) ? type : [type];
          if (types.some((value) => String(value).toLowerCase() === "product")) {
            products.push(item);
          }
        }
      }
    } catch {
      // Some storefronts ship invalid JSON-LD. Meta tags still give us a good fallback.
    }
  }

  return products[0];
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
    || /image|img|photo|product|media|cdn|static|assets|merce|fotos|images/.test(normalized)
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
    /https?:\\?\/\\?\/[^"'\\\s]+?(?:\.(?:avif|webp|png|jpe?g|gif|svg)(?:\?[^"'\\\s]*)?|\/(?:image|images|media|product|products|fotos?)\/[^"'\\\s]+)/gi;
  for (const match of html.matchAll(scriptUrlPattern)) {
    values.push(match[0]);
  }

  return values;
}

function uniqueImages(values: Array<string | undefined>, baseUrl: string) {
  const seen = new Set<string>();
  return values
    .flatMap((value) => (value ? [value] : []))
    .map((value) => absolutize(value, baseUrl))
    .filter((value): value is string => Boolean(value))
    .filter(looksLikeProductImage)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, MAX_IMAGE_CANDIDATES);
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

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const url = body?.url?.trim();

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
    const product = readJsonLd(html);
    const baseUrl = response.url || productUrl.toString();
    const imageCandidates = uniqueImages(
      [
        ...normalizeImages(product?.image),
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
    const images = await resolveImages(imageCandidates, baseUrl);
    const image = images[0];
    const title = cleanText(String(product?.name ?? "")) || pickTitle(html);
    const color = cleanText(String(product?.color ?? ""));

    return NextResponse.json({
      ok: true,
      title,
      image,
      images,
      color,
      imageSource: imageCandidates[0],
      imageCandidates,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown import error",
    });
  }
}
