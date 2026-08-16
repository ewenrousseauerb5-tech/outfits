"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Category = "top" | "bottom" | "shoes";
type GarmentKind = "tshirt" | "shirt" | "sweater" | "sweatshirt" | "jacket" | "pants" | "jeans" | "shoes";
type Occasion = "office" | "casual" | "dinner" | "travel";
type Intent = "minimal" | "smart" | "relaxed";
type Season = "all" | "warm" | "mild" | "cold";

type Garment = {
  id: string;
  name: string;
  category: Category;
  kind?: GarmentKind;
  color: string;
  season: Season;
  formality: number;
  image?: string;
  images?: string[];
  productUrl?: string;
  brand?: string;
  price?: string;
  currency?: string;
  sourceHost?: string;
  importConfidence?: "high" | "medium" | "low";
  importFields?: string[];
  favorite: boolean;
  notes: string;
};

type ProductImport = {
  ok: boolean;
  title?: string;
  image?: string;
  images?: string[];
  brand?: string;
  price?: string;
  currency?: string;
  description?: string;
  availability?: string;
  sku?: string;
  color?: string;
  sourceHost?: string;
  confidence?: "high" | "medium" | "low";
  fields?: string[];
  imageCandidates?: string[];
  error?: string;
};

type Outfit = {
  id: string;
  title: string;
  pieces: Record<Category, Garment>;
  score: number;
  summary: string;
  reasons: string[];
  confidence: string;
};

const allowedCategories: Category[] = ["top", "bottom", "shoes"];

const garmentKinds: Array<{ value: GarmentKind; label: string; category: Category }> = [
  { value: "shirt", label: "Camisa", category: "top" },
  { value: "tshirt", label: "Camiseta", category: "top" },
  { value: "sweater", label: "Jersey", category: "top" },
  { value: "sweatshirt", label: "Sudadera", category: "top" },
  { value: "jacket", label: "Chaqueta", category: "top" },
  { value: "pants", label: "Pantalon", category: "bottom" },
  { value: "jeans", label: "Vaquero", category: "bottom" },
  { value: "shoes", label: "Zapatos", category: "shoes" },
];

const kindLabels = garmentKinds.reduce(
  (labels, kind) => ({ ...labels, [kind.value]: kind.label }),
  {} as Record<GarmentKind, string>,
);

const kindCategories = garmentKinds.reduce(
  (categories, kind) => ({ ...categories, [kind.value]: kind.category }),
  {} as Record<GarmentKind, Category>,
);

const starterWardrobe: Garment[] = [
  {
    id: "g-1",
    name: "Camisa blanca Oxford",
    category: "top",
    kind: "shirt",
    color: "white",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Camisa base para oficina y reuniones.",
  },
  {
    id: "g-2",
    name: "Camiseta negra lisa",
    category: "top",
    kind: "tshirt",
    color: "black",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Para dias de oficina mas informales.",
  },
  {
    id: "g-3",
    name: "Pantalon azul marino",
    category: "bottom",
    kind: "pants",
    color: "navy",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Pantalon facil para oficina sin traje.",
  },
  {
    id: "g-4",
    name: "Vaquero recto claro",
    category: "bottom",
    kind: "jeans",
    color: "stone",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Opcion informal para viernes o dias tranquilos.",
  },
  {
    id: "g-5",
    name: "Mocasines marron oscuro",
    category: "shoes",
    kind: "shoes",
    color: "black",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Zapato de oficina para looks mas formales.",
  },
  {
    id: "g-6",
    name: "Zapatillas blancas",
    category: "shoes",
    kind: "shoes",
    color: "white",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Opcion comoda para oficina informal.",
  },
];

const categoryLabels: Record<Category, string> = {
  top: "Parte de arriba",
  bottom: "Parte de abajo",
  shoes: "Zapatos",
};

const categoryShortLabels: Record<Category, string> = {
  top: "Arriba",
  bottom: "Abajo",
  shoes: "Zapatos",
};

const intentLabels: Record<Intent, string> = {
  minimal: "Minimal",
  smart: "Elegante",
  relaxed: "Relajado",
};

const seasonLabels: Record<Season, string> = {
  all: "Todo el ano",
  warm: "Calor",
  mild: "Templado",
  cold: "Frio",
};

const targetFormality: Record<Occasion, number> = {
  office: 4,
  casual: 2,
  dinner: 4,
  travel: 2,
};

const compatibleColors: Record<string, string[]> = {
  black: ["white", "gray", "blue", "navy", "brown", "stone"],
  white: ["black", "navy", "blue", "gray", "brown", "olive", "stone"],
  navy: ["white", "gray", "brown", "blue", "stone"],
  blue: ["white", "black", "gray", "brown", "navy", "stone"],
  gray: ["white", "black", "navy", "blue", "stone"],
  brown: ["white", "navy", "blue", "black", "olive", "stone"],
  olive: ["white", "black", "navy", "brown"],
  stone: ["white", "black", "navy", "brown", "blue", "gray"],
};

const neutralColors = ["white", "black", "navy", "gray", "brown", "stone"];
const lightColors = ["white", "gray", "stone"];
const darkColors = ["black", "navy", "brown", "olive"];

const importDefaults: Record<Category, { color: string; formality: number }> = {
  top: { color: "white", formality: 3 },
  bottom: { color: "navy", formality: 3 },
  shoes: { color: "brown", formality: 3 },
};

const colorKeywords: Record<string, string[]> = {
  white: ["white", "blanco", "blanca", "cream", "ivory"],
  black: ["black", "negro", "negra"],
  navy: ["navy", "marino"],
  blue: ["blue", "azul", "denim", "jean", "vaquero"],
  gray: ["gray", "grey", "gris"],
  brown: ["brown", "marron", "cuero", "camel"],
  olive: ["olive", "oliva", "verde"],
  stone: ["stone", "piedra"],
};

function migrateKnownGarmentColor(name: string, color: string) {
  if (/mocasines marron oscuro/i.test(name)) return "black";
  if (/vaquero recto claro/i.test(name)) return "stone";
  return color;
}

function normalizeGarments(value: unknown): Garment[] {
  if (!Array.isArray(value)) return starterWardrobe;

  const garments = value
    .filter((item): item is Partial<Garment> => Boolean(item && typeof item === "object"))
    .filter((item) => allowedCategories.includes(item.category as Category))
    .map((item) => ({
      id: item.id ?? `g-${crypto.randomUUID()}`,
      name: item.name ?? "Prenda sin nombre",
      category: item.category as Category,
      kind: item.kind && item.kind in kindLabels ? item.kind as GarmentKind : undefined,
      color: migrateKnownGarmentColor(item.name ?? "", item.color ?? "white"),
      season: item.season ?? "all",
      formality: item.formality ?? 3,
      image: item.image,
      images: item.images?.length ? item.images : item.image ? [item.image] : [],
      productUrl: item.productUrl ?? "",
      brand: item.brand ?? "",
      price: item.price ?? "",
      currency: item.currency ?? "",
      sourceHost: item.sourceHost ?? "",
      importConfidence: item.importConfidence,
      importFields: item.importFields ?? [],
      favorite: Boolean(item.favorite),
      notes: item.notes ?? "",
    }));

  return garments.length ? garments : starterWardrobe;
}

function getImages(item: { image?: string; images?: string[] }) {
  return item.images?.length ? item.images : item.image ? [item.image] : [];
}

function getPrimaryImage(item: { image?: string; images?: string[] }) {
  return getImages(item)[0];
}

function needsImageRepair(item: Garment) {
  const image = getPrimaryImage(item);
  return Boolean(
    item.productUrl
      && /massimodutti/i.test(item.productUrl)
      && (!image || image.startsWith("data:image/svg+xml") || image.startsWith("http")),
  );
}

function readImages(
  event: ChangeEvent<HTMLInputElement>,
  callback: (value: string[]) => void,
) {
  const files = Array.from(event.target.files ?? []);
  if (!files.length) return;

  Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        }),
    ),
  ).then(callback);
}

function titleFromUrl(url: string, category: Category) {
  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split("/").filter(Boolean).at(-1) ?? parsed.hostname;
    const clean = decodeURIComponent(slug)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_+]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (clean) return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return `${categoryShortLabels[category]} importado`;
  }
}

function inferColor(source: string, category: Category) {
  const normalized = source.toLowerCase();
  const color = Object.entries(colorKeywords).find(([, keywords]) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  )?.[0];

  return color ?? importDefaults[category].color;
}

function inferFormality(source: string, category: Category) {
  const normalized = source.toLowerCase();
  if (/oxford|shirt|camisa|mocasin|loafer|formal|tailored|trouser|chino/.test(normalized)) {
    return 4;
  }
  if (/sneaker|zapatilla|tee|camiseta|jean|vaquero|denim|cargo/.test(normalized)) {
    return 2;
  }

  return importDefaults[category].formality;
}

function hostFromUrl(source?: string) {
  if (!source) return "";
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatPrice(price?: string, currency?: string) {
  if (!price) return "";
  const cleanPrice = price.trim();
  const cleanCurrency = currency?.trim();
  if (!cleanCurrency) return cleanPrice;

  const symbol = cleanCurrency === "EUR" ? "€" : cleanCurrency === "GBP" ? "£" : cleanCurrency === "USD" ? "$" : "";
  return symbol ? `${cleanPrice} ${symbol}` : `${cleanPrice} ${cleanCurrency}`;
}

function swatchColor(color: string) {
  const swatches: Record<string, string> = {
    black: "#171717",
    white: "#f8f8f2",
    navy: "#1f2f4f",
    blue: "#7e9fbd",
    gray: "#9a9a94",
    brown: "#6b5142",
    olive: "#68715a",
    stone: "#d8d1c2",
  };

  return swatches[color] ?? color;
}

function createImportedGarment({
  category,
  kind,
  image,
  images,
  source,
  title,
  color,
  brand,
  price,
  currency,
  description,
  availability,
  sku,
  sourceHost,
  confidence,
  fields,
  index,
}: {
  category: Category;
  kind?: GarmentKind;
  image?: string;
  images?: string[];
  source?: string;
  title?: string;
  color?: string;
  brand?: string;
  price?: string;
  currency?: string;
  description?: string;
  availability?: string;
  sku?: string;
  sourceHost?: string;
  confidence?: "high" | "medium" | "low";
  fields?: string[];
  index: number;
}): Garment {
  const kindLabel = kind ? kindLabels[kind] : categoryLabels[category];
  const basis = [title, source, color, brand, description, `${kindLabel} foto ${index + 1}`]
    .filter(Boolean)
    .join(" ");
  const name = title?.trim()
    || (source ? titleFromUrl(source, category) : `${kindLabel} importada ${index + 1}`);
  const gallery = images?.length ? images : image ? [image] : [];
  const metadata = [
    brand && `Marca: ${brand}`,
    formatPrice(price, currency) && `Precio: ${formatPrice(price, currency)}`,
    availability && `Estado: ${availability.replace(/^https?:\/\/schema.org\//, "")}`,
    sku && `SKU: ${sku}`,
  ].filter(Boolean);

  return {
    id: `g-${Date.now()}-${category}-${index}-${Math.random().toString(16).slice(2)}`,
    name,
    category,
    kind,
    color: inferColor(basis, category),
    season: "all",
    formality: inferFormality(basis, category),
    image: gallery[0],
    images: gallery,
    productUrl: source?.trim() ?? "",
    brand: brand?.trim() ?? "",
    price: price?.trim() ?? "",
    currency: currency?.trim() ?? "",
    sourceHost: sourceHost?.trim() || hostFromUrl(source),
    importConfidence: confidence,
    importFields: fields ?? [],
    favorite: false,
    notes: source
      ? [
          gallery.length
            ? "Importada desde tienda con datos detectados."
            : "Importada desde enlace de tienda. Revisa imagen si la tienda bloquea el acceso.",
          description,
          metadata.join(" · "),
        ].filter(Boolean).join(" ")
      : "Importada desde foto. Lista para combinar.",
  };
}

async function importProductLink(category: Category, source: string, index: number, kind?: GarmentKind) {
  try {
    const response = await fetch("/api/import-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: source, category }),
    });

    const data = (await response.json()) as ProductImport;
    const garment = createImportedGarment({
      category,
      kind,
      source,
      index,
      title: data.title,
      color: data.color,
      image: data.image,
      images: data.images,
      brand: data.brand,
      price: data.price,
      currency: data.currency,
      description: data.description,
      availability: data.availability,
      sku: data.sku,
      sourceHost: data.sourceHost,
      confidence: data.confidence,
      fields: data.fields,
    });

    if (!getPrimaryImage(garment) && data.error) {
      return {
        ...garment,
        notes: `Importada desde enlace, pero la tienda bloqueo imagenes: ${data.error}`,
      };
    }

    return garment;
  } catch {
    return createImportedGarment({ category, kind, source, index });
  }
}

function scoreGarment(garment: Garment, occasion: Occasion, season: Season, intent: Intent) {
  const formalityGap = Math.abs(garment.formality - targetFormality[occasion]);
  let score = 10 - formalityGap * 1.6;

  if (garment.favorite) score += 1.2;
  if (garment.season === season || garment.season === "all" || season === "all") score += 1;
  if (intent === "minimal" && ["white", "black", "navy", "gray"].includes(garment.color)) score += 1.3;
  if (intent === "smart" && garment.formality >= 4) score += 1.4;
  if (intent === "relaxed" && garment.formality <= 3) score += 1.2;

  return score;
}

function pairColorScore(a: string, b: string) {
  if (a === b) return neutralColors.includes(a) ? 0.9 : 0.2;
  if (compatibleColors[a]?.includes(b) || compatibleColors[b]?.includes(a)) return 1.8;
  if (neutralColors.includes(a) || neutralColors.includes(b)) return 1;
  return -0.8;
}

function hasContrast(colors: string[]) {
  return colors.some((color) => lightColors.includes(color)) && colors.some((color) => darkColors.includes(color));
}

function analyzeOutfit(pieces: Garment[], season: Season, intent: Intent) {
  const [top, bottom, shoes] = pieces;
  const colors = pieces.map((piece) => piece.color);
  const averageFormality = pieces.reduce((total, piece) => total + piece.formality, 0) / pieces.length;
  const formalitySpread = Math.max(...pieces.map((piece) => piece.formality)) - Math.min(...pieces.map((piece) => piece.formality));
  const colorScore =
    pairColorScore(top.color, bottom.color) +
    pairColorScore(bottom.color, shoes.color) +
    pairColorScore(top.color, shoes.color);
  const officeScore = 9 - Math.abs(averageFormality - targetFormality.office) * 1.8 - formalitySpread * 0.7;
  const seasonScore = pieces.every((piece) => piece.season === "all" || piece.season === season || season === "all") ? 2 : -1;
  const imageScore = pieces.filter((piece) => getPrimaryImage(piece)).length * 0.25;
  const importScore = pieces.filter((piece) => piece.productUrl).length * 0.15;
  const intentScore =
    intent === "smart"
      ? pieces.filter((piece) => piece.formality >= 4).length * 0.6
      : intent === "relaxed"
        ? pieces.filter((piece) => piece.formality <= 3).length * 0.5
        : colors.filter((color) => neutralColors.includes(color)).length * 0.45;

  const reasons = [];
  if (colors.every((color) => neutralColors.includes(color))) {
    reasons.push("Paleta neutra, facil de llevar en oficina.");
  } else if (hasContrast(colors)) {
    reasons.push("Buen contraste entre prendas claras y oscuras.");
  } else {
    reasons.push("Colores compatibles sin llamar demasiado la atencion.");
  }

  if (averageFormality >= 3.5 && formalitySpread <= 2) {
    reasons.push("Nivel de formalidad equilibrado para trabajo.");
  } else if (shoes.formality >= bottom.formality) {
    reasons.push("Los zapatos elevan el conjunto.");
  } else {
    reasons.push("Look mas relajado, mejor para dias sin reuniones.");
  }

  if (top.color !== bottom.color && bottom.color !== shoes.color) {
    reasons.push("Las tres piezas se leen separadas y ordenadas.");
  }

  return {
    score: colorScore + officeScore + seasonScore + imageScore + importScore + intentScore,
    reasons: reasons.slice(0, 3),
    confidence: colorScore > 3.5 && officeScore > 6.5 ? "Alta" : "Media",
    summary: `${top.name}, ${bottom.name} y ${shoes.name}. ${reasons[0]}`,
  };
}

function buildOutfits(wardrobe: Garment[], occasion: Occasion, season: Season, intent: Intent) {
  const sorted = (category: Category) =>
    wardrobe
      .filter((item) => item.category === category)
      .sort(
        (a, b) =>
          scoreGarment(b, occasion, season, intent) -
          scoreGarment(a, occasion, season, intent),
      )
      .slice(0, 6);

  const tops = sorted("top");
  const bottoms = sorted("bottom");
  const shoes = sorted("shoes");
  const outfits: Outfit[] = [];

  tops.forEach((top) => {
    bottoms.forEach((bottom) => {
      shoes.forEach((shoe) => {
        const pieces = [top, bottom, shoe];
        const ai = analyzeOutfit(pieces, season, intent);
        const score =
          pieces.reduce((total, item) => total + scoreGarment(item, occasion, season, intent), 0) +
          ai.score;

        outfits.push({
          id: `${top.id}-${bottom.id}-${shoe.id}-${score.toFixed(2)}`,
          title: `Recomendacion ${intentLabels[intent].toLowerCase()}`,
          pieces: { top, bottom, shoes: shoe },
          score,
          summary: ai.summary,
          reasons: ai.reasons,
          confidence: ai.confidence,
        });
      });
    });
  });

  return outfits.sort((a, b) => b.score - a.score).slice(0, 4);
}

function OutfitBoard({
  outfit,
  onNext,
}: {
  outfit: Outfit;
  onNext: (category: Category) => void;
}) {
  return (
    <div className="fit-board" aria-label="Composicion del outfit">
      {allowedCategories.map((category) => {
        const piece = outfit.pieces[category];
        const image = getPrimaryImage(piece);

        return (
          <article className={`floating-piece floating-piece-${category}`} key={category}>
            <div className="floating-image">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt={piece.name} />
              ) : (
                <span>{categoryShortLabels[category]}</span>
              )}
            </div>
            <button
              className="floating-callout"
              type="button"
              aria-label={`Cambiar ${categoryLabels[category].toLowerCase()}`}
              onClick={() => onNext(category)}
            >
              <span className="callout-line" aria-hidden="true" />
              <span className="callout-copy">
                <strong>{categoryLabels[category]}</strong>
                <em>{piece.name}</em>
                <small>{[piece.kind ? kindLabels[piece.kind] : categoryShortLabels[category], piece.color].join(" · ")}</small>
              </span>
            </button>
          </article>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [wardrobe, setWardrobe] = useState<Garment[]>(starterWardrobe);
  const occasion: Occasion = "office";
  const [season, setSeason] = useState<Season>("all");
  const [intent, setIntent] = useState<Intent>("minimal");
  const [importDraft, setImportDraft] = useState<{ kind: GarmentKind; images: string[]; links: string }>({
    kind: "shirt",
    images: [],
    links: "",
  });
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState(0);
  const [pieceOverrides, setPieceOverrides] = useState<Partial<Record<Category, string>>>({});
  const [hydrated, setHydrated] = useState(false);
  const autoRepairDone = useRef(false);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const savedWardrobe = window.localStorage.getItem("outfits-wardrobe");
      if (savedWardrobe) setWardrobe(normalizeGarments(JSON.parse(savedWardrobe)));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("outfits-wardrobe", JSON.stringify(wardrobe));
  }, [hydrated, wardrobe]);

  const outfits = useMemo(
    () => buildOutfits(wardrobe, occasion, season, intent),
    [wardrobe, occasion, season, intent],
  );

  const activeOutfitIndex = outfits.length
    ? Math.min(selectedOutfitIndex, outfits.length - 1)
    : 0;
  const selectedOutfit = outfits[activeOutfitIndex];
  const displayedOutfit = useMemo(() => {
    if (!selectedOutfit) return undefined;

    const pieces = { ...selectedOutfit.pieces };
    allowedCategories.forEach((category) => {
      const override = wardrobe.find((item) => item.id === pieceOverrides[category]);
      if (override?.category === category) pieces[category] = override;
    });

    return {
      ...selectedOutfit,
      pieces,
      id: `${selectedOutfit.id}-${allowedCategories.map((category) => pieces[category].id).join("-")}`,
      summary: `${pieces.top.name}, ${pieces.bottom.name} y ${pieces.shoes.name}.`,
    };
  }, [pieceOverrides, selectedOutfit, wardrobe]);

  const counts = useMemo(
    () =>
      allowedCategories.reduce(
        (acc, category) => ({
          ...acc,
          [category]: wardrobe.filter((item) => item.category === category).length,
        }),
        {} as Record<Category, number>,
      ),
    [wardrobe],
  );

  async function importGarments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImportStatus("Importando prendas...");
    const category = kindCategories[importDraft.kind];

    const photoImports = importDraft.images.map((image, index) =>
      createImportedGarment({ category, kind: importDraft.kind, image, index }),
    );
    const linkInputs = importDraft.links
      .split(/\n|,/)
      .map((link) => link.trim())
      .filter(Boolean)
      .map((source, index) => ({
        category,
        kind: importDraft.kind,
        source,
        index: importDraft.images.length + index,
      }));

    const linkImports = await Promise.all(
      linkInputs.map((item) => importProductLink(item.category, item.source, item.index, item.kind)),
    );
    const imported = [...photoImports, ...linkImports];

    if (!imported.length) {
      setImportStatus("Sube fotos o pega enlaces para importar.");
      return;
    }

    setWardrobe((items) => [...imported, ...items]);
    setPieceOverrides((current) => {
      const next = { ...current };
      for (const category of allowedCategories) {
        const newest = imported.find((item) => item.category === category);
        if (newest) next[category] = newest.id;
      }
      return next;
    });
    setImportDraft((draft) => ({ ...draft, images: [], links: "" }));
    const withImages = imported.filter((item) => getPrimaryImage(item)).length;
    setImportStatus(`${imported.length} prendas importadas · ${withImages} con imagen.`);
  }

  function removeGarment(id: string) {
    setWardrobe((items) => items.filter((item) => item.id !== id));
  }

  function renameGarment(id: string, name: string) {
    setWardrobe((items) =>
      items.map((item) =>
        item.id === id ? { ...item, name: name || "Prenda sin nombre" } : item,
      ),
    );
  }

  function updateGarmentColor(id: string, color: string) {
    setWardrobe((items) =>
      items.map((item) =>
        item.id === id ? { ...item, color: color.trim().toLowerCase() || "white" } : item,
      ),
    );
  }

  function attachImagesToGarment(id: string, images: string[]) {
    if (!images.length) return;

    setWardrobe((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const gallery = [...images, ...getImages(item)];

        return {
          ...item,
          image: gallery[0],
          images: gallery,
          notes: item.notes || "Foto anadida manualmente.",
        };
      }),
    );
    setImportStatus("Foto anadida a la prenda.");
  }

  async function repairImportedImages(items = wardrobe.filter(needsImageRepair)) {
    if (!items.length) {
      setImportStatus("No hay prendas pendientes de reparar.");
      return;
    }

    setImportStatus(`Reparando fotos de ${items.length} prendas...`);
    const refreshed = await Promise.all(
      items.map(async (item) => ({
        id: item.id,
        garment: await importProductLink(item.category, item.productUrl ?? "", 0, item.kind),
      })),
    );

    setWardrobe((currentItems) =>
      currentItems.map((item) => {
        const match = refreshed.find((entry) => entry.id === item.id)?.garment;
        if (!match) return item;

        const nextImages = match.images?.length ? match.images : item.images;
        return {
          ...item,
          name: match.name || item.name,
          image: nextImages?.[0] || item.image,
          images: nextImages,
          brand: match.brand || item.brand,
          price: match.price || item.price,
          currency: match.currency || item.currency,
          importConfidence: match.importConfidence || item.importConfidence,
          importFields: match.importFields?.length ? match.importFields : item.importFields,
          notes: match.notes || item.notes,
        };
      }),
    );
    setImportStatus("Fotos reparadas. Si alguna sigue sin imagen, pega la URL directa de la foto o usa el boton Foto.");
  }

  useEffect(() => {
    if (!hydrated || autoRepairDone.current) return;
    autoRepairDone.current = true;

    const repairable = wardrobe.filter(needsImageRepair);
    if (!repairable.length) return;

    queueMicrotask(() => {
      void (async () => {
        setImportStatus(`Reparando fotos de ${repairable.length} prendas...`);
        const refreshed = await Promise.all(
          repairable.map(async (item) => ({
            id: item.id,
            garment: await importProductLink(item.category, item.productUrl ?? "", 0, item.kind),
          })),
        );

        setWardrobe((currentItems) =>
          currentItems.map((item) => {
            const match = refreshed.find((entry) => entry.id === item.id)?.garment;
            if (!match) return item;

            const nextImages = match.images?.length ? match.images : item.images;
            return {
              ...item,
              name: match.name || item.name,
              image: nextImages?.[0] || item.image,
              images: nextImages,
              brand: match.brand || item.brand,
              price: match.price || item.price,
              currency: match.currency || item.currency,
              importConfidence: match.importConfidence || item.importConfidence,
              importFields: match.importFields?.length ? match.importFields : item.importFields,
              notes: match.notes || item.notes,
            };
          }),
        );
        setImportStatus("Fotos reparadas.");
      })();
    });
  }, [hydrated, wardrobe]);

  async function refreshGarment(id: string) {
    const current = wardrobe.find((item) => item.id === id);
    if (!current?.productUrl) return;

    setImportStatus(`Actualizando ${current.name}...`);
    const refreshed = await importProductLink(current.category, current.productUrl, 0, current.kind);
    setWardrobe((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              name: refreshed.name || item.name,
              color: refreshed.color || item.color,
              formality: refreshed.formality || item.formality,
              image: refreshed.image || item.image,
              images: refreshed.images?.length ? refreshed.images : item.images,
              brand: refreshed.brand || item.brand,
              price: refreshed.price || item.price,
              currency: refreshed.currency || item.currency,
              sourceHost: refreshed.sourceHost || item.sourceHost,
              importConfidence: refreshed.importConfidence || item.importConfidence,
              importFields: refreshed.importFields?.length ? refreshed.importFields : item.importFields,
              notes: refreshed.notes || item.notes,
            }
          : item,
      ),
    );
    setImportStatus(`Actualizada: ${current.name}.`);
  }

  function cyclePiece(category: Category) {
    const current = displayedOutfit?.pieces[category] ?? selectedOutfit?.pieces[category];
    const candidates = wardrobe.filter((item) => item.category === category);
    if (!current || candidates.length < 2) return;

    const currentIndex = Math.max(0, candidates.findIndex((item) => item.id === current.id));
    const next = candidates[(currentIndex + 1) % candidates.length];
    setPieceOverrides((items) => ({ ...items, [category]: next.id }));
  }

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-label="Generador profesional de outfits">
        <div>
          <p className="eyebrow">Armario de oficina</p>
          <h1>Looks de trabajo sin pensarlo.</h1>
          <p>Combina parte de arriba, parte de abajo y zapatos para salir listo por la manana.</p>
        </div>
        <div className="studio-stats" aria-label="Estado del armario">
          {allowedCategories.map((category) => (
            <div key={category}>
              <strong>{counts[category] ?? 0}</strong>
              <span>{categoryShortLabels[category]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="planner-bar" aria-label="Preferencias del look">
        <label>
          Temporada
          <select
            value={season}
            onChange={(event) => setSeason(event.target.value as Season)}
          >
            {Object.entries(seasonLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estilo
          <select
            value={intent}
            onChange={(event) => setIntent(event.target.value as Intent)}
          >
            {Object.entries(intentLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="look-section" aria-label="Look seleccionado">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Look recomendado</p>
            <h2>{displayedOutfit?.title ?? "Anade mas prendas"}</h2>
          </div>
        </div>

        <div className="look-layout">
          <div className="look-board fit-board-shell" aria-label="Visual del outfit">
            {displayedOutfit ? (
              <OutfitBoard outfit={displayedOutfit} onNext={cyclePiece} />
            ) : (
              <div className="empty-state">
                <strong>Faltan piezas</strong>
                <p>Anade al menos una prenda en cada categoria.</p>
              </div>
            )}
          </div>

          <aside className="look-details" aria-label="Analisis del look">
            {displayedOutfit && (
              <div className="look-brief">
                <p className="eyebrow">Seleccion</p>
                <h3>{displayedOutfit.summary}</h3>
                <div className="color-story" aria-label="Paleta del look">
                  {allowedCategories.map((category) => {
                    const piece = displayedOutfit.pieces[category];
                    return (
                      <span key={category}>
                        <i style={{ background: swatchColor(piece.color) }} />
                        {piece.kind ? kindLabels[piece.kind] : categoryShortLabels[category]}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {displayedOutfit && (
              <div className="ai-reasoning" aria-label="Analisis de recomendacion">
                <div>
                  <span>IA</span>
                  <strong>Confianza {displayedOutfit.confidence}</strong>
                </div>
                <ul>
                  {displayedOutfit.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {displayedOutfit && (
              <div className="look-actions">
                <p>Alternativas</p>
                <span>Cambia una propuesta o pulsa una prenda en el visual para rotarla.</span>
              </div>
            )}
            <div className="outfit-switcher" aria-label="Cambiar propuesta">
              {outfits.map((outfit, index) => (
                <button
                  className={index === activeOutfitIndex ? "active" : ""}
                  key={outfit.id}
                  type="button"
                  onClick={() => {
                    setSelectedOutfitIndex(index);
                    setPieceOverrides({});
                  }}
                >
                  Look {index + 1}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="workspace-grid single" aria-label="Anadir prendas">
        <div className="tool-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Anadir prendas</p>
            <h2>Fotos o enlaces de tienda.</h2>
          </div>
          <form className="import-form" onSubmit={importGarments}>
            <section className="import-lane">
              <div className="import-lane-header">
                <div>
                  <p>Tipo de prenda</p>
                  <strong>{kindLabels[importDraft.kind]}</strong>
                </div>
                <span>
                  {importDraft.images.length} fotos ·{" "}
                  {
                    importDraft.links
                      .split(/\n|,/)
                      .map((link) => link.trim())
                      .filter(Boolean).length
                  }{" "}
                  enlaces
                </span>
              </div>
              <label>
                Prenda
                <select
                  value={importDraft.kind}
                  onChange={(event) =>
                    setImportDraft((draft) => ({ ...draft, kind: event.target.value as GarmentKind }))
                  }
                >
                  {garmentKinds.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="drop-control">
                Fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) =>
                    readImages(event, (images) =>
                      setImportDraft((draft) => ({
                        ...draft,
                        images: [...draft.images, ...images],
                      })),
                    )
                  }
                />
              </label>
              {importDraft.images.length > 0 && (
                <div className="upload-preview compact" aria-label={`${kindLabels[importDraft.kind]} cargadas`}>
                  {importDraft.images.map((image, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={`${kindLabels[importDraft.kind]} ${index + 1}`}
                      key={`${image}-${index}`}
                    />
                  ))}
                </div>
              )}
              <label>
                Enlaces de tienda
                <textarea
                  placeholder="Pega enlaces de tienda o enlaces directos de imagen, uno por linea"
                  value={importDraft.links}
                  onChange={(event) =>
                    setImportDraft((draft) => ({
                      ...draft,
                      links: event.target.value,
                    }))
                  }
                />
              </label>
            </section>
            <button className="primary-action" type="submit">
              Importar al armario
            </button>
            <button className="secondary-action" type="button" onClick={() => repairImportedImages()}>
              Reparar fotos
            </button>
            {importStatus && <p className="import-status">{importStatus}</p>}
          </form>
        </div>
      </section>

      <section className="closet-section" aria-label="Inventario">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mi armario</p>
            <h2>{wardrobe.length} prendas guardadas.</h2>
          </div>
        </div>
        <div className="closet-grid">
          {wardrobe.map((garment) => {
            const primaryImage = getPrimaryImage(garment);
            const imageCount = getImages(garment).length;
            return (
              <article className="garment-card" key={garment.id}>
                <div className="garment-image">
                  {primaryImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryImage} alt={garment.name} />
                  ) : (
                    <span>{garment.color}</span>
                  )}
                </div>
                <div className="garment-info">
                  <label className="name-editor">
                    <span>{garment.kind ? kindLabels[garment.kind] : categoryLabels[garment.category]}</span>
                    <input
                      aria-label={`Nombre de ${garment.name}`}
                      value={garment.name}
                      onChange={(event) => renameGarment(garment.id, event.target.value)}
                    />
                  </label>
                  <label className="color-editor">
                    Color
                    <input
                      aria-label={`Color de ${garment.name}`}
                      value={garment.color}
                      onChange={(event) => updateGarmentColor(garment.id, event.target.value)}
                    />
                  </label>
                  <p className="product-description">
                    {imageCount > 1 ? `${imageCount} fotos` : "1 foto"}
                    {garment.productUrl ? " · tienda" : ""}
                  </p>
                </div>
                <div className="garment-actions">
                  <label className="image-action">
                    Foto
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) =>
                        readImages(event, (images) => attachImagesToGarment(garment.id, images))
                      }
                    />
                  </label>
                  {garment.productUrl && (
                    <button type="button" onClick={() => refreshGarment(garment.id)}>
                      Actualizar
                    </button>
                  )}
                  <button type="button" onClick={() => removeGarment(garment.id)}>
                    Quitar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
