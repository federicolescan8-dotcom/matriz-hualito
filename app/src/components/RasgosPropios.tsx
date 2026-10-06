"use client";

import { useState } from "react";
import { hslCss } from "@/engine/color";
import type { Marca } from "@/engine/diagnostico";
import { formaParametrica, normalizarContorno, PREFIJO_PROPIA, type DetalleRecurrente, type RecursosPropios } from "@/engine/recursos";
import { contornoDeSvg } from "@/lib/imagen";
import { FormaSvg, PatronSvg } from "./Graficos";

// Rasgos propios (replanteo, E2): lo que solo tiene esta marca. La forma la dibuja el diseñador (Illustrator, Corel) y
// se carga en SVG; como atajo, se puede generar una con semilla a partir de los ejes.

const DETALLES: { id: DetalleRecurrente | null; nombre: string }[] = [
  { id: null, nombre: "Ninguno" },
  { id: "subrayado", nombre: "Subrayado del título" },
  { id: "marco", nombre: "Marco fino" },
];

export function RasgosPropios({ marca, onChange }: { marca: Marca; onChange: (m: Marca) => void }) {
  const p = marca.identidad.paleta;
  const r: RecursosPropios = marca.identidad.recursos ?? { formas: [] };
  const [semilla, setSemilla] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const propuesta = formaParametrica(semilla, marca.diagnostico.ejes);
  const set = (cambios: Partial<RecursosPropios>) => onChange({ ...marca, identidad: { ...marca.identidad, recursos: { ...r, ...cambios } } });

  async function subir(file: File | undefined) {
    if (!file) return;
    setError(null);
    const puntos = contornoDeSvg(await file.text());
    const d = normalizarContorno(puntos);
    if (!d) {
      setError("No se encontró ninguna figura en el SVG. Exportalo con los trazos convertidos en contornos.");
      return;
    }
    const nombre = file.name.replace(/\.svg$/i, "");
    set({ formas: [{ id: `${PREFIJO_PROPIA}${Date.now()}`, nombre, categoria: "propias", d, contiene: true }, ...r.formas] });
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="font-medium">Rasgos propios</h3>
        <span className="text-xs text-neutral-500">Van primero en la capa decorativa, las decoraciones y la forma de fondo de todas las piezas.</span>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Formas propias</span>
          <div className="flex flex-wrap gap-3">
            {r.formas.map((f, i) => (
              <div key={f.id} className="flex flex-col items-center gap-1 text-xs">
                <div className="flex h-20 w-20 items-center justify-center rounded-md p-2" style={{ background: hslCss(p.fondo_neutro) }}>
                  <FormaSvg id={f.id} formas={r.formas} color={p.tono_apoyo} style={{ width: "100%", height: "100%" }} />
                </div>
                <span className="max-w-20 truncate">{i === 0 ? "★ " : ""}{f.nombre}</span>
                <span className="flex gap-2">
                  {i > 0 && (
                    <button type="button" onClick={() => set({ formas: [f, ...r.formas.filter((x) => x.id !== f.id)] })} className="underline">
                      principal
                    </button>
                  )}
                  <button type="button" onClick={() => set({ formas: r.formas.filter((x) => x.id !== f.id) })} className="underline">
                    quitar
                  </button>
                </span>
              </div>
            ))}
            {r.formas.length === 0 && <span className="text-xs text-neutral-500">Todavía no tiene. Se usan las del rubro.</span>}
          </div>
          <label className="cursor-pointer self-start rounded-md border border-neutral-300 px-3 py-1.5">
            Subir SVG del diseñador
            <input type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e) => void subir(e.target.files?.[0])} />
          </label>
          {error && <span className="text-xs text-red-700">{error}</span>}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Generar con los ejes</span>
          <div className="flex h-20 w-20 items-center justify-center rounded-md p-2" style={{ background: hslCss(p.fondo_neutro) }}>
            <FormaSvg id={propuesta.id} formas={[propuesta]} color={p.tono_apoyo} style={{ width: "100%", height: "100%" }} />
          </div>
          <span className="flex gap-2 text-xs">
            <button type="button" onClick={() => setSemilla((s) => s + 1)} className="underline">otra</button>
            <button type="button" onClick={() => set({ formas: [...r.formas, { ...propuesta, nombre: `Generada ${semilla}` }] })} className="underline">
              usar
            </button>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Patrón propio</span>
          <div className="relative h-20 w-32 overflow-hidden rounded-md" style={{ background: hslCss(p.fondo_neutro) }}>
            {r.formas[0] && <PatronSvg id="propio" forma={r.formas[0]} color={p.color_marca} opacidad={0.3} celda={22} />}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" disabled={!r.formas.length} checked={!!r.patron_propio && r.formas.length > 0} onChange={(e) => set({ patron_propio: e.target.checked })} />
            Repetir la forma principal como patrón
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Detalle recurrente</span>
          <select value={r.detalle ?? ""} onChange={(e) => set({ detalle: (e.target.value || null) as DetalleRecurrente | null })} className="rounded-md border border-neutral-300 px-2 py-1.5">
            {DETALLES.map((d) => (
              <option key={d.nombre} value={d.id ?? ""}>{d.nombre}</option>
            ))}
          </select>
          <span className="max-w-48 text-xs text-neutral-500">En la tinta de la marca, en todas las piezas.</span>
        </label>
      </div>
    </div>
  );
}
