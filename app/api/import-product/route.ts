import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

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
    return new URL(url, baseUrl).toString();
  } catch {
    return undefined;
  }
}

async function imageToDataUrl(imageUrl?: string) {
  if (!imageUrl) return undefined;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
      },
    });
    if (!response.ok) return imageUrl;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return imageUrl;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) return imageUrl;

    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return imageUrl;
  }
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
    const rawImage =
      normalizeImage(product?.image)
      ?? pickMeta(html, ["og:image:secure_url", "og:image", "twitter:image"]);
    const absoluteImage = rawImage ? absolutize(rawImage, response.url || productUrl.toString()) : undefined;
    const image = await imageToDataUrl(absoluteImage);
    const title = cleanText(String(product?.name ?? "")) || pickTitle(html);
    const color = cleanText(String(product?.color ?? ""));

    return NextResponse.json({
      ok: true,
      title,
      image,
      images: image ? [image] : [],
      color,
      imageSource: absoluteImage,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown import error",
    });
  }
}
