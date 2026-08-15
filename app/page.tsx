"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Category = "top" | "bottom" | "shoes";
type Occasion = "office" | "casual" | "dinner" | "travel";
type Intent = "minimal" | "smart" | "relaxed";
type Season = "all" | "warm" | "mild" | "cold";

type Garment = {
  id: string;
  name: string;
  category: Category;
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
};

const allowedCategories: Category[] = ["top", "bottom", "shoes"];

const starterWardrobe: Garment[] = [
  {
    id: "g-1",
    name: "Camisa blanca Oxford",
    category: "top",
    color: "white",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Base limpia para oficina, cenas y looks pulidos.",
  },
  {
    id: "g-2",
    name: "Camiseta negra premium",
    category: "top",
    color: "black",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Funciona para looks simples con buena silueta.",
  },
  {
    id: "g-3",
    name: "Pantalon azul marino",
    category: "bottom",
    color: "navy",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Mas elegante que un vaquero, sin ser traje.",
  },
  {
    id: "g-4",
    name: "Vaquero recto claro",
    category: "bottom",
    color: "blue",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Para dias relajados y combinaciones limpias.",
  },
  {
    id: "g-5",
    name: "Mocasines marron oscuro",
    category: "shoes",
    color: "brown",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Suben el nivel sin esfuerzo.",
  },
  {
    id: "g-6",
    name: "Zapatillas blancas",
    category: "shoes",
    color: "white",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Comodas, neutras y faciles.",
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

const occasionLabels: Record<Occasion, string> = {
  office: "Oficina",
  casual: "Casual",
  dinner: "Cena",
  travel: "Viaje",
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
  black: ["white", "gray", "blue", "navy", "brown"],
  white: ["black", "navy", "blue", "gray", "brown", "olive"],
  navy: ["white", "gray", "brown", "blue"],
  blue: ["white", "black", "gray", "brown", "navy"],
  gray: ["white", "black", "navy", "blue"],
  brown: ["white", "navy", "blue", "black", "olive"],
  olive: ["white", "black", "navy", "brown"],
};

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
};

function normalizeGarments(value: unknown): Garment[] {
  if (!Array.isArray(value)) return starterWardrobe;

  const garments = value
    .filter((item): item is Partial<Garment> => Boolean(item && typeof item === "object"))
    .filter((item) => allowedCategories.includes(item.category as Category))
    .map((item) => ({
      id: item.id ?? `g-${crypto.randomUUID()}`,
      name: item.name ?? "Prenda sin nombre",
      category: item.category as Category,
      color: item.color ?? "white",
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

function createImportedGarment({
  category,
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
  const basis = [title, source, color, brand, description, `${categoryShortLabels[category]} foto ${index + 1}`]
    .filter(Boolean)
    .join(" ");
  const name = title?.trim()
    || (source ? titleFromUrl(source, category) : `${categoryLabels[category]} importada ${index + 1}`);
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

async function importProductLink(category: Category, source: string, index: number) {
  try {
    const response = await fetch("/api/import-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: source, category }),
    });

    const data = (await response.json()) as ProductImport;
    const garment = createImportedGarment({
      category,
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
    return createImportedGarment({ category, source, index });
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

function colorHarmony(pieces: Garment[]) {
  return pieces.reduce((total, piece, index) => {
    const previous = pieces[index - 1];
    if (!previous) return total;
    return total + (compatibleColors[previous.color]?.includes(piece.color) ? 1.5 : -0.5);
  }, 0);
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
        const score =
          pieces.reduce((total, item) => total + scoreGarment(item, occasion, season, intent), 0) +
          colorHarmony(pieces);

        outfits.push({
          id: `${top.id}-${bottom.id}-${shoe.id}-${score.toFixed(2)}`,
          title: `${occasionLabels[occasion]} ${intentLabels[intent].toLowerCase()}`,
          pieces: { top, bottom, shoes: shoe },
          score,
          summary: `${top.color}, ${bottom.color} y ${shoe.color}; una combinacion de tres piezas con nivel ${targetFormality[occasion]}/5.`,
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
                {(piece.brand || piece.price) && (
                  <small>{[piece.brand, formatPrice(piece.price, piece.currency)].filter(Boolean).join(" · ")}</small>
                )}
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
  const [occasion, setOccasion] = useState<Occasion>("office");
  const [season, setSeason] = useState<Season>("all");
  const [intent, setIntent] = useState<Intent>("minimal");
  const [importDrafts, setImportDrafts] = useState<
    Record<Category, { images: string[]; links: string }>
  >({
    top: { images: [], links: "" },
    bottom: { images: [], links: "" },
    shoes: { images: [], links: "" },
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

    const photoImports = allowedCategories.flatMap((category) => {
      const draft = importDrafts[category];
      return draft.images.map((image, index) =>
        createImportedGarment({ category, image, index }),
      );
    });

    const linkInputs = allowedCategories.flatMap((category) => {
      const draft = importDrafts[category];
      return draft.links
        .split(/\n|,/)
        .map((link) => link.trim())
        .filter(Boolean)
        .map((source, index) => ({
          category,
          source,
          index: draft.images.length + index,
        }));
    });

    const linkImports = await Promise.all(
      linkInputs.map((item) => importProductLink(item.category, item.source, item.index)),
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
    setImportDrafts({
      top: { images: [], links: "" },
      bottom: { images: [], links: "" },
      shoes: { images: [], links: "" },
    });
    const withImages = imported.filter((item) => getPrimaryImage(item)).length;
    setImportStatus(`${imported.length} prendas importadas · ${withImages} con imagen.`);
  }

  function removeGarment(id: string) {
    setWardrobe((items) => items.filter((item) => item.id !== id));
  }

  function toggleFavorite(id: string) {
    setWardrobe((items) =>
      items.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite } : item,
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
        garment: await importProductLink(item.category, item.productUrl ?? "", 0),
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
            garment: await importProductLink(item.category, item.productUrl ?? "", 0),
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
    const refreshed = await importProductLink(current.category, current.productUrl, 0);
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
          <p className="eyebrow">Outfit engine</p>
          <h1>Tu armario convertido en sistema.</h1>
          <p>
            Importa prendas con fotos o enlaces. El motor cruza arriba, abajo y
            zapatos para proponerte looks limpios, modernos y sin friccion.
          </p>
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
          Ocasion
          <select
            value={occasion}
            onChange={(event) => setOccasion(event.target.value as Occasion)}
          >
            {Object.entries(occasionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
          Direccion
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
          <p className="eyebrow">Output</p>
            <h2>{displayedOutfit?.title ?? "Anade mas prendas"}</h2>
          </div>
          {displayedOutfit && <span className="score-pill">{Math.round(displayedOutfit.score)} pts</span>}
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

          <aside className="look-details" aria-label="Prendas del look">
            <div className="piece-list">
              {displayedOutfit &&
                allowedCategories.map((category) => {
                  const piece = displayedOutfit.pieces[category];
                  const image = getPrimaryImage(piece);
                  return (
                    <article className="piece-card" key={piece.id}>
                      <div className="piece-thumb">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={piece.name} />
                        ) : (
                          <span>{piece.color}</span>
                        )}
                      </div>
                      <div>
                        <p>{categoryLabels[piece.category]}</p>
                        <h3>{piece.name}</h3>
                        {(piece.brand || piece.price) && (
                          <p className="commerce-line">
                            {[piece.brand, formatPrice(piece.price, piece.currency)].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <small>
                          {piece.color} · formalidad {piece.formality}/5
                        </small>
                        {piece.productUrl && (
                          <a href={piece.productUrl} target="_blank" rel="noreferrer">
                            Ver fuente
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
            </div>
            {displayedOutfit && <p className="look-summary">{displayedOutfit.summary}</p>}
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
            <p className="eyebrow">Input</p>
            <h2>Importa por fotos o links.</h2>
          </div>
          <form className="import-form" onSubmit={importGarments}>
            {allowedCategories.map((category) => (
              <section className="import-lane" key={category}>
                <div className="import-lane-header">
                  <div>
                    <p>{categoryLabels[category]}</p>
                    <strong>{categoryShortLabels[category]}</strong>
                  </div>
                  <span>
                    {importDrafts[category].images.length} fotos ·{" "}
                    {
                      importDrafts[category].links
                        .split(/\n|,/)
                        .map((link) => link.trim())
                        .filter(Boolean).length
                    }{" "}
                    enlaces
                  </span>
                </div>
                <label className="drop-control">
                  Fotos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                      readImages(event, (images) =>
                        setImportDrafts((drafts) => ({
                          ...drafts,
                          [category]: {
                            ...drafts[category],
                            images: [...drafts[category].images, ...images],
                          },
                        })),
                      )
                    }
                  />
                </label>
                {importDrafts[category].images.length > 0 && (
                  <div className="upload-preview compact" aria-label={`${categoryLabels[category]} cargadas`}>
                    {importDrafts[category].images.map((image, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={`${categoryLabels[category]} ${index + 1}`}
                        key={`${image}-${index}`}
                      />
                    ))}
                  </div>
                )}
                <label>
                  Enlaces de tienda
                  <textarea
                    placeholder="Pega enlaces de tienda o enlaces directos de imagen, uno por linea"
                    value={importDrafts[category].links}
                    onChange={(event) =>
                      setImportDrafts((drafts) => ({
                        ...drafts,
                        [category]: {
                          ...drafts[category],
                          links: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </section>
            ))}
            <button className="primary-action" type="submit">
              Importar al armario
            </button>
            <button className="secondary-action" type="button" onClick={() => repairImportedImages()}>
              Reparar fotos de enlaces
            </button>
            {importStatus && <p className="import-status">{importStatus}</p>}
          </form>
        </div>
      </section>

      <section className="closet-section" aria-label="Inventario">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Database</p>
            <h2>{wardrobe.length} prendas en rotacion.</h2>
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
                  <p>{categoryLabels[garment.category]}</p>
                  <h3>{garment.name}</h3>
                  {(garment.brand || garment.price) && (
                    <p className="commerce-line">
                      {[garment.brand, formatPrice(garment.price, garment.currency)].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <small>
                    {garment.color} · nivel {garment.formality}/5
                  </small>
                  {garment.notes && <p className="notes">{garment.notes}</p>}
                  <div className="garment-meta">
                    {imageCount > 1 && <span>{imageCount} fotos</span>}
                    {garment.sourceHost && <span>{garment.sourceHost}</span>}
                    {garment.importConfidence && <span>Import {garment.importConfidence}</span>}
                    {garment.favorite && <span>Favorita</span>}
                    {garment.productUrl && (
                      <a href={garment.productUrl} target="_blank" rel="noreferrer">
                        Fuente
                      </a>
                    )}
                  </div>
                </div>
                <div className="garment-actions">
                  <button type="button" onClick={() => toggleFavorite(garment.id)}>
                    {garment.favorite ? "Favorita" : "Marcar"}
                  </button>
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
