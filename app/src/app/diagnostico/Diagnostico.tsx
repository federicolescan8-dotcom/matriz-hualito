"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { hexToHsl } from "@/engine/color";
import {
  construirMarca,
  diagnosticoVacio,
  generarChips,
  pendientesMarca,
  type Chip,
  type Diagnostico,
  type Marca,
} from "@/engine/diagnostico";
import { dataUrlASvg, recolorearSvg, svgADataUrl } from "@/engine/logo";
import { PRESETS, RUBROS, type Tono, type ValorMarca } from "@/engine/presets";
import { FAMILIAS, resolverTipografia } from "@/engine/typography";
import { PiezaMuestra } from "@/components/PiezaMuestra";
import { FichaMarca } from "@/components/FichaMarca";
import { CampoHex } from "@/components/CampoHex";
import { descargarJson, guardarMarca } from "@/lib/marcas";
import { recortarTransparencia } from "@/lib/imagen";

const PASOS = ["Rubro", "Personalidad", "Color", "Insumos", "Resultado"] as const;

const VALORES: { v: ValorMarca; etiqueta: string; efecto: string }[] = [
  { v: "confianza", etiqueta: "Confianza", efecto: "acento análogo" },
  { v: "calma", etiqueta: "Calma", efecto: "acento análogo" },
  { v: "energia", etiqueta: "Energía", efecto: "acento complementario" },
  { v: "innovacion", etiqueta: "Innovación", efecto: "acento complementario" },
];

function Opcion({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        activa ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:border-neutral-500"
      }`}
    >
      {children}
    </button>
  );
}

export function DiagnosticoWizard() {
  const [paso, setPaso] = useState(0);
  const [d, setD] = useState<Diagnostico>(diagnosticoVacio);
  const [chipId, setChipId] = useState<string | null>(null);
  const [marca, setMarca] = useState<Marca | null>(null);
  const [guardada, setGuardada] = useState<boolean | null>(null);
  const [excluidoHex, setExcluidoHex] = useState<string | null>(null);

  const chips = useMemo(() => generarChips(d), [d]);
  const chip: Chip | undefined = chips.find((c) => c.id === chipId);
  const tipografia = resolverTipografia(d.rubro, d.personalidad.tono, d.tipografia_previa);

  const set = (p: Partial<Diagnostico>) => setD((x) => ({ ...x, ...p }));
  const puedeSeguir = [
    d.nombre.trim().length > 0,
    d.personalidad.tono != null && d.personalidad.valor != null,
    chip?.resultado.estado === "ok",
    true,
    true,
  ][paso];

  function avanzar() {
    if (paso === 3 && chip) {
      setMarca(construirMarca(d, chip));
      setGuardada(null);
    }
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  async function cargarLogo(k: "color" | "mono_claro" | "mono_oscuro", file: File | undefined) {
    if (!file) return;
    const esSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    let url: string;
    let ladoMayor: number | null = null;
    if (esSvg) {
      url = svgADataUrl(await file.text());
    } else {
      const original = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(file);
      });
      const recortada = await recortarTransparencia(original);
      url = recortada.dataUrl;
      ladoMayor = recortada.ladoMayorOriginal;
    }
    setD((x) => {
      const logo = { ...x.logo, [k]: url };
      if (k === "color") {
        logo.formato = esSvg ? "svg" : "png";
        logo.deuda_vectorizar = !esSvg;
        logo.png_lado_mayor = ladoMayor;
      }
      return { ...x, logo };
    });
  }

  function generarMonocromos() {
    const svg = d.logo.color ? dataUrlASvg(d.logo.color) : null;
    if (!svg) return;
    set({
      logo: {
        ...d.logo,
        mono_claro: svgADataUrl(recolorearSvg(svg, "#ffffff")),
        mono_oscuro: svgADataUrl(recolorearSvg(svg, "#1a1a1a")),
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Diagnóstico de marca</h1>
          <p className="text-sm text-neutral-600">10 a 15 minutos con el cliente. Manual v1.1.</p>
        </div>
        <Link href="/marcas" className="text-sm underline">Marcas guardadas</Link>
      </header>

      <ol className="flex flex-wrap gap-2 text-sm">
        {PASOS.map((p, i) => (
          <li key={p}>
            <button
              type="button"
              disabled={i > paso}
              onClick={() => setPaso(i)}
              className={`rounded-full px-3 py-1 ${
                i === paso ? "bg-neutral-900 text-white" : i < paso ? "bg-neutral-200" : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {i + 1}. {p}
            </button>
          </li>
        ))}
      </ol>

      {paso === 0 && (
        <section className="flex flex-col gap-6">
          <label className="flex max-w-md flex-col gap-1 text-sm font-medium">
            Nombre de la marca
            <input
              value={d.nombre}
              onChange={(e) => set({ nombre: e.target.value })}
              className="rounded-md border border-neutral-300 px-3 py-2 font-normal"
              placeholder="Ej. Estudio Pérez"
              autoFocus
            />
          </label>
          <div>
            <h2 className="mb-3 font-medium">¿En qué rubro está?</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {RUBROS.map((r) => (
                <Opcion key={r} activa={d.rubro === r} onClick={() => { set({ rubro: r }); setChipId(null); }}>
                  <div className="font-medium">{PRESETS[r].nombre}</div>
                  <div className="mt-1 text-xs opacity-70">{PRESETS[r].ejemplos}</div>
                </Opcion>
              ))}
            </div>
          </div>
        </section>
      )}

      {paso === 1 && (
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 font-medium">1. Si tu marca fuera una persona, ¿es más seria o más cercana?</h2>
            <div className="grid max-w-xl grid-cols-2 gap-3">
              {(["seria", "cercana"] as Tono[]).map((t) => (
                <Opcion key={t} activa={d.personalidad.tono === t} onClick={() => set({ personalidad: { ...d.personalidad, tono: t } })}>
                  <div className="font-medium capitalize">{t}</div>
                  <div className="mt-1 text-xs opacity-70">Tipografía: {PRESETS[d.rubro].familia[t]}</div>
                </Opcion>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-medium">2. ¿Qué querés transmitir?</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              {VALORES.map(({ v, etiqueta, efecto }) => (
                <Opcion key={v} activa={d.personalidad.valor === v} onClick={() => { set({ personalidad: { ...d.personalidad, valor: v } }); setChipId(null); }}>
                  <div className="font-medium">{etiqueta}</div>
                  <div className="mt-1 text-xs opacity-70">{efecto}</div>
                </Opcion>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 font-medium">3. ¿Hay un color que ya asociás con tu marca, o uno que no querés usar?</h2>
            <div className="flex flex-wrap gap-8">
              <ColorOpcional
                etiqueta="Color corporativo actual"
                valor={d.color_previo_hex}
                onChange={(hex) => { set({ color_previo_hex: hex }); setChipId(null); }}
              />
              <ColorOpcional
                etiqueta="Color que no quiere (banda ±25°)"
                valor={excluidoHex}
                hexInicial="#e30613"
                onChange={(hex) => {
                  setExcluidoHex(hex);
                  set({ excluido_H: hex ? hexToHsl(hex)!.H : null });
                  setChipId(null);
                }}
              />
            </div>
          </div>
        </section>
      )}

      {paso === 2 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-medium">¿Cuál sentís más cercana a tu marca?</h2>
          <p className="text-sm text-neutral-600">
            Cada opción ya está aplicada a una pieza real (Modo A y Modo B). {d.color_previo_hex && "Incluye tu color actual, optimizado y tal cual."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chips.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setChipId(c.id)}
                disabled={!c.resultado.paleta}
                className={`flex flex-col gap-3 rounded-xl border-2 bg-white p-3 text-left transition ${
                  chipId === c.id ? "border-neutral-900" : "border-transparent hover:border-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.etiqueta}</span>
                  <span className="font-mono text-xs text-neutral-500">H{Math.round(c.H)} · {c.modo}</span>
                </div>
                {c.resultado.paleta ? (
                  <div className="grid grid-cols-2 gap-2">
                    <PiezaMuestra paleta={c.resultado.paleta} tipografia={tipografia} rubro={d.rubro} modo="A" nombre={d.nombre} logo={d.logo} />
                    <PiezaMuestra paleta={c.resultado.paleta} tipografia={tipografia} rubro={d.rubro} modo="B" nombre={d.nombre} logo={d.logo} />
                  </div>
                ) : (
                  <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
                    Requiere revisión manual: {c.resultado.motivos.join("; ")}
                  </div>
                )}
              </button>
            ))}
          </div>
          {chip && chip.resultado.log.length > 0 && (
            <details className="text-sm text-neutral-600">
              <summary className="cursor-pointer">Cómo se calculó esta paleta</summary>
              <ul className="mt-2 list-disc pl-5">{chip.resultado.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </details>
          )}
        </section>
      )}

      {paso === 3 && (
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="mb-1 font-medium">Logo</h2>
            <p className="mb-4 text-sm text-neutral-600">
              Ideal: SVG. PNG se acepta con 1000 px mínimo y fondo transparente (queda como deuda para vectorizar).
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ["color", "Versión color"],
                ["mono_claro", "Monocromo claro"],
                ["mono_oscuro", "Monocromo oscuro"],
              ] as const).map(([k, etiqueta]) => (
                <label key={k} className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-4 text-sm">
                  <span className="font-medium">{etiqueta}</span>
                  <div className={`flex h-20 items-center justify-center rounded ${k === "mono_claro" ? "bg-neutral-800" : "bg-neutral-100"}`}>
                    {d.logo[k] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.logo[k]!} alt="" className="max-h-16 max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-neutral-400">sin cargar</span>
                    )}
                  </div>
                  <input type="file" accept=".svg,image/svg+xml,image/png" onChange={(e) => cargarLogo(k, e.target.files?.[0])} className="text-xs" />
                </label>
              ))}
            </div>
            {pendientesMarca(d.logo).length > 0 && d.logo.color && (
              <ul className="mt-3 list-disc pl-5 text-sm text-amber-800">
                {pendientesMarca(d.logo).map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
            {d.logo.formato === "svg" && (!d.logo.mono_claro || !d.logo.mono_oscuro) && (
              <button type="button" onClick={generarMonocromos} className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
                Generar monocromos a partir del SVG color
              </button>
            )}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={d.tiene_fotos_propias} onChange={(e) => set({ tiene_fotos_propias: e.target.checked })} />
              Tiene fotos propias de calidad usable
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Tipografía previa asociada a la marca
              <select
                value={d.tipografia_previa ?? ""}
                onChange={(e) => set({ tipografia_previa: e.target.value || null })}
                className="rounded-md border border-neutral-300 px-3 py-2"
              >
                <option value="">No tiene / no es variable → usar la del sistema</option>
                {Object.keys(FAMILIAS).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          </div>
        </section>
      )}

      {paso === 4 && marca && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-xl font-semibold">{marca.nombre}</h2>
            <button type="button" onClick={() => setGuardada(guardarMarca(marca))} className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white">
              Guardar marca
            </button>
            <button type="button" onClick={() => descargarJson(marca)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
              Exportar JSON
            </button>
          </div>
          {guardada === true && <p className="text-sm text-emerald-700">Marca guardada. <Link href="/marcas" className="underline">Ver marcas</Link></p>}
          {guardada === false && <p className="text-sm text-red-700">No se pudo guardar en este navegador. Exportá el JSON.</p>}
          <FichaMarca marca={marca} onChange={(m) => { setMarca(m); setGuardada(null); }} />
        </section>
      )}

      {paso < 4 && (
        <footer className="flex justify-between border-t border-neutral-200 pt-6">
          <button type="button" onClick={() => setPaso((p) => Math.max(0, p - 1))} disabled={paso === 0} className="text-sm disabled:opacity-30">
            ← Atrás
          </button>
          <button
            type="button"
            onClick={avanzar}
            disabled={!puedeSeguir}
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white disabled:opacity-30"
          >
            {paso === 3 ? "Ver resultado" : "Siguiente →"}
          </button>
        </footer>
      )}
    </div>
  );
}

function ColorOpcional({
  etiqueta,
  valor,
  hexInicial = "#0057b8",
  onChange,
}: {
  etiqueta: string;
  valor: string | null;
  hexInicial?: string;
  onChange: (hex: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={valor != null} onChange={(e) => onChange(e.target.checked ? hexInicial : null)} />
        {etiqueta}
      </label>
      {valor != null && <CampoHex valor={valor} onChange={onChange} />}
    </div>
  );
}
