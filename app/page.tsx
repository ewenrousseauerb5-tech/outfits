"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Category = "top" | "bottom" | "shoes" | "outerwear" | "accessory";
type Occasion = "work" | "casual" | "date" | "travel" | "evening";
type Weather = "warm" | "mild" | "cold" | "rain";
type Energy = "quiet" | "sharp" | "creative";

type Garment = {
  id: string;
  name: string;
  category: Category;
  color: string;
  season: Weather | "all";
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
  mood: Energy;
  image?: string;
  images?: string[];
  sourceUrl?: string;
};

type Outfit = {
  id: string;
  title: string;
  pieces: Garment[];
  reason: string;
};

const starterWardrobe: Garment[] = [
  {
    id: "g-1",
    name: "Camisa blanca Oxford",
    category: "top",
    color: "white",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Base limpia para dias de oficina.",
  },
  {
    id: "g-2",
    name: "Camiseta negra pesada",
    category: "top",
    color: "black",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Funciona con chaquetas y zapatillas.",
  },
  {
    id: "g-3",
    name: "Pantalon azul marino",
    category: "bottom",
    color: "navy",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Mas elegante que vaquero, menos rigido que traje.",
  },
  {
    id: "g-4",
    name: "Vaquero recto claro",
    category: "bottom",
    color: "blue",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Para looks relajados de fin de semana.",
  },
  {
    id: "g-5",
    name: "Mocasines marron oscuro",
    category: "shoes",
    color: "brown",
    season: "all",
    formality: 4,
    favorite: true,
    notes: "Levantan casi cualquier combinacion.",
  },
  {
    id: "g-6",
    name: "Zapatillas blancas",
    category: "shoes",
    color: "white",
    season: "all",
    formality: 2,
    favorite: false,
    notes: "Comodas para dias largos.",
  },
  {
    id: "g-7",
    name: "Sobrecamisa verde oliva",
    category: "outerwear",
    color: "olive",
    season: "mild",
    formality: 2,
    favorite: true,
    notes: "Capa facil cuando hace fresco.",
  },
  {
    id: "g-8",
    name: "Abrigo gris estructurado",
    category: "outerwear",
    color: "gray",
    season: "cold",
    formality: 5,
    favorite: false,
    notes: "Para dias frios y reuniones.",
  },
  {
    id: "g-9",
    name: "Cinturon negro",
    category: "accessory",
    color: "black",
    season: "all",
    formality: 3,
    favorite: false,
    notes: "Cierra bien looks sobrios.",
  },
];

const starterReferences: Reference[] = [
  { id: "r-1", title: "Minimal limpio", mood: "quiet" },
  { id: "r-2", title: "Oficina con caracter", mood: "sharp" },
  { id: "r-3", title: "Casual interesante", mood: "creative" },
];

const categoryLabels: Record<Category, string> = {
  top: "Parte de arriba",
  bottom: "Pantalon",
  shoes: "Zapatos",
  outerwear: "Capa",
  accessory: "Accesorio",
};

const occasionLabels: Record<Occasion, string> = {
  work: "Trabajo",
  casual: "Casual",
  date: "Cita",
  travel: "Viaje",
  evening: "Noche",
};

const weatherLabels: Record<Weather, string> = {
  warm: "Calor",
  mild: "Templado",
  cold: "Frio",
  rain: "Lluvia",
};

const energyLabels: Record<Energy, string> = {
  quiet: "Sin pensar",
  sharp: "Pulido",
  creative: "Con gracia",
};

const targetFormality: Record<Occasion, number> = {
  work: 4,
  casual: 2,
  date: 3,
  travel: 2,
  evening: 4,
};

const compatibleColors: Record<string, string[]> = {
  black: ["white", "gray", "blue", "olive", "brown"],
  white: ["black", "navy", "blue", "olive", "brown", "gray"],
  navy: ["white", "gray", "brown", "olive"],
  blue: ["white", "black", "gray", "brown"],
  gray: ["white", "black", "navy", "olive"],
  brown: ["white", "navy", "blue", "olive"],
  olive: ["white", "black", "navy", "gray", "brown"],
};

const emptyGarment = {
  name: "",
  category: "top" as Category,
  color: "white",
  season: "all" as Garment["season"],
  formality: 3,
  image: "",
  images: [] as string[],
  productUrl: "",
  notes: "",
};

function scoreGarment(
  garment: Garment,
  occasion: Occasion,
  weather: Weather,
  energy: Energy,
) {
  const formalityGap = Math.abs(garment.formality - targetFormality[occasion]);
  let score = 8 - formalityGap * 1.4;

  if (garment.favorite) score += 1.3;
  if (garment.season === weather || garment.season === "all") score += 1.2;
  if (weather === "warm" && garment.category === "outerwear") score -= 3;
  if (weather === "cold" && garment.category === "outerwear") score += 2;
  if (energy === "quiet" && ["white", "black", "navy", "gray"].includes(garment.color)) score += 1;
  if (energy === "creative" && ["olive", "brown", "blue"].includes(garment.color)) score += 1.2;
  if (energy === "sharp" && garment.formality >= 4) score += 1.4;

  return score;
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

function buildOutfits(
  wardrobe: Garment[],
  occasion: Occasion,
  weather: Weather,
  energy: Energy,
) {
  const byCategory = (category: Category) =>
    wardrobe
      .filter((item) => item.category === category)
      .sort(
        (a, b) =>
          scoreGarment(b, occasion, weather, energy) -
          scoreGarment(a, occasion, weather, energy),
      );

  const tops = byCategory("top");
  const bottoms = byCategory("bottom");
  const shoes = byCategory("shoes");
  const layers = byCategory("outerwear");
  const accessories = byCategory("accessory");

  const options: Outfit[] = [];

  tops.slice(0, 5).forEach((top) => {
    bottoms.slice(0, 5).forEach((bottom) => {
      shoes.slice(0, 4).forEach((shoe) => {
        const layer =
          weather === "warm"
            ? undefined
            : layers.find((item) => item.season === weather) ?? layers[0];
        const accessory = accessories[0];
        const pieces = [top, bottom, shoe, layer, accessory].filter(Boolean) as Garment[];
        const colorScore = pieces.reduce((total, piece, index) => {
          const previous = pieces[index - 1];
          if (!previous) return total;
          const match = compatibleColors[previous.color]?.includes(piece.color);
          return total + (match ? 1.5 : -0.3);
        }, 0);
        const score =
          pieces.reduce(
            (total, piece) => total + scoreGarment(piece, occasion, weather, energy),
            0,
          ) + colorScore;

        options.push({
          id: `${top.id}-${bottom.id}-${shoe.id}-${layer?.id ?? "none"}-${accessory?.id ?? "none"}`,
          title: `${occasionLabels[occasion]} ${energyLabels[energy].toLowerCase()}`,
          pieces,
          reason: `Equilibra ${top.color}, ${bottom.color} y ${shoe.color}; encaja con ${weatherLabels[weather].toLowerCase()} y nivel ${targetFormality[occasion]}/5.`,
        });
        options[options.length - 1].id += `-${score.toFixed(2)}`;
      });
    });
  });

  return options
    .sort((a, b) => Number(b.id.split("-").at(-1)) - Number(a.id.split("-").at(-1)))
    .slice(0, 3);
}

export default function Home() {
  const [wardrobe, setWardrobe] = useState<Garment[]>(starterWardrobe);
  const [references, setReferences] = useState<Reference[]>(starterReferences);
  const [occasion, setOccasion] = useState<Occasion>("work");
  const [weather, setWeather] = useState<Weather>("mild");
  const [energy, setEnergy] = useState<Energy>("quiet");
  const [form, setForm] = useState(emptyGarment);
  const [referenceForm, setReferenceForm] = useState({
    title: "",
    mood: "quiet" as Energy,
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
      if (savedWardrobe) setWardrobe(JSON.parse(savedWardrobe));
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
    () => buildOutfits(wardrobe, occasion, weather, energy),
    [wardrobe, occasion, weather, energy],
  );

  const activeOutfitIndex = outfits.length
    ? Math.min(selectedOutfitIndex, outfits.length - 1)
    : 0;
  const selectedOutfit = outfits[activeOutfitIndex];

  const counts = useMemo(
    () =>
      wardrobe.reduce(
        (acc, garment) => ({
          ...acc,
          [garment.category]: (acc[garment.category] ?? 0) + 1,
        }),
        {} as Record<Category, number>,
      ),
    [wardrobe],
  );

  function addGarment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    setWardrobe((items) => [
      {
        ...form,
        id: `g-${Date.now()}`,
        name: form.name.trim(),
        image: getPrimaryImage(form),
        images: form.images,
        productUrl: form.productUrl.trim(),
        favorite: false,
      },
      ...items,
    ]);
    setForm(emptyGarment);
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
    setReferenceForm({ title: "", mood: "quiet", image: "", images: [], sourceUrl: "" });
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
      <section className="command-center" aria-label="Generador de outfits">
        <div className="intro">
          <p className="eyebrow">Armario inteligente</p>
          <h1>Outfits bonitos con la ropa que ya tienes.</h1>
          <p>
            Sube fotos de prendas y referencias; la app cruza ocasion, clima y
            energia del dia para darte combinaciones listas antes del cafe.
          </p>
        </div>

        <div className="planner-panel">
          <div className="control-group">
            <label htmlFor="occasion">Ocasion</label>
            <select
              id="occasion"
              value={occasion}
              onChange={(event) => setOccasion(event.target.value as Occasion)}
            >
              {Object.entries(occasionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="weather">Clima</label>
            <select
              id="weather"
              value={weather}
              onChange={(event) => setWeather(event.target.value as Weather)}
            >
              {Object.entries(weatherLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="energy">Modo</label>
            <select
              id="energy"
              value={energy}
              onChange={(event) => setEnergy(event.target.value as Energy)}
            >
              {Object.entries(energyLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="outfit-strip" aria-label="Look seleccionado">
        <div className="section-heading">
          <p className="eyebrow">Propuestas de hoy</p>
          <h2>Maniqui y prendas puestas.</h2>
        </div>
        <div className="look-studio">
          <div className="mannequin-stage" aria-label="Maniqui del outfit">
            <div className="mannequin">
              <div className="mannequin-head" />
              <div className="mannequin-neck" />
              <div className="mannequin-torso" />
              <div className="mannequin-arm left" />
              <div className="mannequin-arm right" />
              <div className="mannequin-leg left" />
              <div className="mannequin-leg right" />
              {selectedOutfit?.pieces.map((piece) => {
                const image = getPrimaryImage(piece);
                return (
                  <div
                    className={`worn-piece worn-${piece.category}`}
                    key={`${selectedOutfit.id}-${piece.id}`}
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={piece.name} />
                    ) : (
                      <span>{piece.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="worn-panel" aria-label="Prendas del outfit">
            <div className="outfit-card-header">
              <span>Look seleccionado</span>
              <strong>{selectedOutfit?.title}</strong>
            </div>
            <div className="piece-row">
              {selectedOutfit?.pieces.map((piece) => {
                const image = getPrimaryImage(piece);
                return (
                  <div className="piece-chip detailed" key={piece.id}>
                    <div className="piece-thumb">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={piece.name} />
                      ) : (
                        <span>{piece.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p>{piece.name}</p>
                      <small>
                        {categoryLabels[piece.category]} · {piece.color} · nivel{" "}
                        {piece.formality}/5
                      </small>
                      {piece.productUrl && (
                        <a href={piece.productUrl} target="_blank" rel="noreferrer">
                          Ver prenda
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedOutfit && <p className="reason">{selectedOutfit.reason}</p>}
            <div className="outfit-switcher" aria-label="Cambiar propuesta">
              {outfits.map((outfit, index) => (
                <button
                  className={index === activeOutfitIndex ? "active" : ""}
                  key={outfit.id}
                  type="button"
                  onClick={() => setSelectedOutfitIndex(index)}
                >
                  Opcion {index + 1}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="workspace-grid" aria-label="Armario y referencias">
        <div className="tool-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Anadir prenda</p>
            <h2>Tu armario real.</h2>
          </div>
          <form className="stacked-form" onSubmit={addGarment}>
            <label>
              Nombre
              <input
                required
                placeholder="Ej. jersey gris merino"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Tipo
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value as Category })
                  }
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Color
                <select
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                >
                  {["white", "black", "navy", "blue", "gray", "brown", "olive"].map(
                    (color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Temporada
                <select
                  value={form.season}
                  onChange={(event) =>
                    setForm({ ...form, season: event.target.value as Garment["season"] })
                  }
                >
                  <option value="all">Todo el ano</option>
                  {Object.entries(weatherLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Formalidad
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={form.formality}
                  onChange={(event) =>
                    setForm({ ...form, formality: Number(event.target.value) })
                  }
                />
              </label>
            </div>
            <label>
              Fotos de la prenda
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  readImages(event, (images) =>
                    setForm({ ...form, image: images[0], images }),
                  )
                }
              />
            </label>
            {form.images.length > 0 && (
              <div className="upload-preview" aria-label="Fotos cargadas">
                {form.images.map((image, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt={`Foto ${index + 1} de ${form.name || "prenda"}`}
                    key={`${image}-${index}`}
                  />
                ))}
              </div>
            )}
            <label>
              Enlace de la prenda
              <input
                inputMode="url"
                placeholder="https://..."
                value={form.productUrl}
                onChange={(event) =>
                  setForm({ ...form, productUrl: event.target.value })
                }
              />
            </label>
            <label>
              Notas
              <textarea
                placeholder="Como queda, con que combina, cuando evitarla..."
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
            <button className="primary-action" type="submit">
              Anadir prenda
            </button>
          </form>
        </div>

        <div className="tool-panel">
          <div className="section-heading compact">
            <p className="eyebrow">Referencias</p>
            <h2>El gusto que quieres copiar.</h2>
          </div>
          <form className="stacked-form" onSubmit={addReference}>
            <label>
              Titulo
              <input
                placeholder="Ej. verano italiano sobrio"
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
                  setReferenceForm({ ...referenceForm, mood: event.target.value as Energy })
                }
              >
                {Object.entries(energyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fotos o captura de referencia
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
                  <img
                    src={image}
                    alt={`Referencia ${index + 1}`}
                    key={`${image}-${index}`}
                  />
                ))}
              </div>
            )}
            <label>
              Enlace de referencia
              <input
                inputMode="url"
                placeholder="Pinterest, Instagram, tienda o articulo"
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
                      <span>{energyLabels[reference.mood]}</span>
                    )}
                  </div>
                  <div>
                    <strong>{reference.title}</strong>
                    <p>{energyLabels[reference.mood]}</p>
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
          <p className="eyebrow">Inventario</p>
          <h2>{wardrobe.length} prendas listas para combinar.</h2>
        </div>
        <div className="category-meter" aria-label="Categorias disponibles">
          {Object.entries(categoryLabels).map(([category, label]) => (
            <span key={category}>
              {label}: {counts[category as Category] ?? 0}
            </span>
          ))}
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
                  <div>
                    <p>{categoryLabels[garment.category]}</p>
                    <h3>{garment.name}</h3>
                  </div>
                  <small>
                    {garment.color} · nivel {garment.formality}/5
                  </small>
                  {garment.notes && <p className="notes">{garment.notes}</p>}
                  <div className="garment-meta">
                    {imageCount > 1 && <span>{imageCount} fotos</span>}
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
