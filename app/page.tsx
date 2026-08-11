"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

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
  favorite: boolean;
  notes: string;
};

type Reference = {
  id: string;
  title: string;
  mood: Intent;
  image?: string;
  images?: string[];
  sourceUrl?: string;
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

const starterReferences: Reference[] = [
  { id: "r-1", title: "Minimal limpio", mood: "minimal" },
  { id: "r-2", title: "Smart casual europeo", mood: "smart" },
  { id: "r-3", title: "Relaxed premium", mood: "relaxed" },
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

function createImportedGarment({
  category,
  image,
  source,
  index,
}: {
  category: Category;
  image?: string;
  source?: string;
  index: number;
}): Garment {
  const basis = source ?? `${categoryShortLabels[category]} foto ${index + 1}`;
  const name = source
    ? titleFromUrl(source, category)
    : `${categoryLabels[category]} importada ${index + 1}`;

  return {
    id: `g-${Date.now()}-${category}-${index}-${Math.random().toString(16).slice(2)}`,
    name,
    category,
    color: inferColor(basis, category),
    season: "all",
    formality: inferFormality(basis, category),
    image,
    images: image ? [image] : [],
    productUrl: source?.trim() ?? "",
    favorite: false,
    notes: source
      ? "Importada desde enlace de tienda."
      : "Importada desde foto. Lista para combinar.",
  };
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

export default function Home() {
  const [wardrobe, setWardrobe] = useState<Garment[]>(starterWardrobe);
  const [references, setReferences] = useState<Reference[]>(starterReferences);
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
  const [referenceForm, setReferenceForm] = useState({
    title: "",
    mood: "minimal" as Intent,
    image: "",
    images: [] as string[],
    sourceUrl: "",
  });
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const savedWardrobe = window.localStorage.getItem("outfits-wardrobe");
      const savedReferences = window.localStorage.getItem("outfits-references");
      if (savedWardrobe) setWardrobe(normalizeGarments(JSON.parse(savedWardrobe)));
      if (savedReferences) setReferences(JSON.parse(savedReferences));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("outfits-wardrobe", JSON.stringify(wardrobe));
  }, [hydrated, wardrobe]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("outfits-references", JSON.stringify(references));
  }, [hydrated, references]);

  const outfits = useMemo(
    () => buildOutfits(wardrobe, occasion, season, intent),
    [wardrobe, occasion, season, intent],
  );

  const activeOutfitIndex = outfits.length
    ? Math.min(selectedOutfitIndex, outfits.length - 1)
    : 0;
  const selectedOutfit = outfits[activeOutfitIndex];

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

  function importGarments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const imported = allowedCategories.flatMap((category) => {
      const draft = importDrafts[category];
      const photoItems = draft.images.map((image, index) =>
        createImportedGarment({ category, image, index }),
      );
      const linkItems = draft.links
        .split(/\n|,/)
        .map((link) => link.trim())
        .filter(Boolean)
        .map((source, index) =>
          createImportedGarment({
            category,
            source,
            index: draft.images.length + index,
          }),
        );

      return [...photoItems, ...linkItems];
    });

    if (!imported.length) return;

    setWardrobe((items) => [...imported, ...items]);
    setImportDrafts({
      top: { images: [], links: "" },
      bottom: { images: [], links: "" },
      shoes: { images: [], links: "" },
    });
  }

  function addReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !referenceForm.title.trim() &&
      !referenceForm.images.length &&
      !referenceForm.sourceUrl.trim()
    ) {
      return;
    }

    setReferences((items) => [
      {
        id: `r-${Date.now()}`,
        title: referenceForm.title.trim() || "Referencia sin titulo",
        mood: referenceForm.mood,
        image: getPrimaryImage(referenceForm),
        images: referenceForm.images,
        sourceUrl: referenceForm.sourceUrl.trim(),
      },
      ...items,
    ]);
    setReferenceForm({ title: "", mood: "minimal", image: "", images: [], sourceUrl: "" });
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

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-label="Generador profesional de outfits">
        <div>
          <p className="eyebrow">Outfit studio</p>
          <h1>Looks completos sin pensar por la manana.</h1>
          <p>
            Un sistema simple y cuidado: parte de arriba, parte de abajo y
            zapatos. Nada mas. La combinacion correcta, con tu propia ropa.
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
            <p className="eyebrow">Look recomendado</p>
            <h2>{selectedOutfit?.title ?? "Anade mas prendas"}</h2>
          </div>
          {selectedOutfit && <span className="score-pill">{Math.round(selectedOutfit.score)} pts</span>}
        </div>

        <div className="look-layout">
          <div className="look-board" aria-label="Visual del outfit">
            {selectedOutfit ? (
              allowedCategories.map((category) => {
                const piece = selectedOutfit.pieces[category];
                const image = getPrimaryImage(piece);
                return (
                  <article className={`look-slot ${category}`} key={category}>
                    <span>{categoryShortLabels[category]}</span>
                    <div>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={piece.name} />
                      ) : (
                        <strong>{piece.name}</strong>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="empty-state">
                <strong>Faltan piezas</strong>
                <p>Anade al menos una prenda en cada categoria.</p>
              </div>
            )}
          </div>

          <aside className="look-details" aria-label="Prendas del look">
            <div className="piece-list">
              {selectedOutfit &&
                allowedCategories.map((category) => {
                  const piece = selectedOutfit.pieces[category];
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
            {selectedOutfit && <p className="look-summary">{selectedOutfit.summary}</p>}
            <div className="outfit-switcher" aria-label="Cambiar propuesta">
              {outfits.map((outfit, index) => (
                <button
                  className={index === activeOutfitIndex ? "active" : ""}
                  key={outfit.id}
                  type="button"
                  onClick={() => setSelectedOutfitIndex(index)}
                >
                  Look {index + 1}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="workspace-grid" aria-label="Anadir prendas y referencias">
        <div className="tool-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Importar prendas</p>
            <h2>Fotos o enlaces. Sin fichas manuales.</h2>
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
                    placeholder="Pega uno o varios enlaces, uno por linea"
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
          </form>
        </div>

        <div className="tool-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Referencias</p>
            <h2>Direccion estetica.</h2>
          </div>
          <form className="stacked-form" onSubmit={addReference}>
            <label>
              Titulo
              <input
                placeholder="Ej. smart casual limpio"
                value={referenceForm.title}
                onChange={(event) =>
                  setReferenceForm({ ...referenceForm, title: event.target.value })
                }
              />
            </label>
            <label>
              Mood
              <select
                value={referenceForm.mood}
                onChange={(event) =>
                  setReferenceForm({ ...referenceForm, mood: event.target.value as Intent })
                }
              >
                {Object.entries(intentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fotos o captura
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  readImages(event, (images) =>
                    setReferenceForm({ ...referenceForm, image: images[0], images }),
                  )
                }
              />
            </label>
            {referenceForm.images.length > 0 && (
              <div className="upload-preview" aria-label="Referencias cargadas">
                {referenceForm.images.map((image, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={`Referencia ${index + 1}`} key={`${image}-${index}`} />
                ))}
              </div>
            )}
            <label>
              Enlace
              <input
                inputMode="url"
                placeholder="Pinterest, tienda, articulo o lookbook"
                value={referenceForm.sourceUrl}
                onChange={(event) =>
                  setReferenceForm({ ...referenceForm, sourceUrl: event.target.value })
                }
              />
            </label>
            <button className="secondary-action" type="submit">
              Guardar referencia
            </button>
          </form>

          <div className="reference-list">
            {references.map((reference) => {
              const primaryImage = getPrimaryImage(reference);
              return (
                <article key={reference.id} className="reference-card">
                  <div className="reference-image">
                    {primaryImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={primaryImage} alt={reference.title} />
                    ) : (
                      <span>{intentLabels[reference.mood]}</span>
                    )}
                  </div>
                  <div>
                    <strong>{reference.title}</strong>
                    <p>{intentLabels[reference.mood]}</p>
                    {reference.sourceUrl && (
                      <a href={reference.sourceUrl} target="_blank" rel="noreferrer">
                        Abrir referencia
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="closet-section" aria-label="Inventario">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Armario</p>
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
                  <small>
                    {garment.color} · nivel {garment.formality}/5
                  </small>
                  {garment.notes && <p className="notes">{garment.notes}</p>}
                  <div className="garment-meta">
                    {imageCount > 1 && <span>{imageCount} fotos</span>}
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
