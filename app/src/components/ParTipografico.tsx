"use client";

import { useEffect, useState } from "react";
import type { Marca } from "@/engine/diagnostico";
import { familiaDeEjes } from "@/engine/ejes";
import { PRESETS } from "@/engine/presets";
import { CLASE_FAMILIA, controlPar, elegirPar, FAMILIAS, familiaTexto, paresSugeridos, type ClaseFamilia } from "@/engine/typography";
import { cargarFuentePropia, fontFamily } from "@/lib/fuentes";

// Tipografía en par (replanteo, E3): display para títulos y texto para el resto, con las reglas de combinación del
// motor, y la fuente propia de la marca (WOFF2).

const CLASES: { id: ClaseFamilia; nombre: string }[] = [
  { id: "serif", nombre: "Serif" },
  { id: "geometrica", nombre: "Sans geométrica" },
  { id: "grotesca", nombre: "Sans grotesca" },
  { id: "humanista", nombre: "Sans humanista" },
];

export function ParTipografico({ marca, onChange }: { marca: Marca; onChange: (m: Marca) => void }) {
  const t = marca.identidad.tipografia;
  const display = t.familia_variable;
  const texto = familiaTexto(t);
  const propia = t.propia;
  const regla = controlPar(display, texto, t);
  const sugeridos = paresSugeridos(display, t);
  const italicaRubro = PRESETS[marca.rubro].italic;
  const [clase, setClase] = useState<ClaseFamilia>("geometrica");

  // La fuente propia se registra en el documento para que se vea en las muestras.
  useEffect(() => {
    void cargarFuentePropia(propia);
  }, [propia]);

  const setPar = (d: string, x: string | null) =>
    onChange({ ...marca, identidad: { ...marca.identidad, tipografia: { ...elegirPar(t, d, x, italicaRubro), previa: false } } });

  const opciones = (
    <>
      {CLASES.map((c) => (
        <optgroup key={c.id} label={c.nombre}>
          {Object.keys(FAMILIAS)
            .filter((f) => CLASE_FAMILIA[f] === c.id)
            .map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
        </optgroup>
      ))}
      {propia && (
        <optgroup label="Propia">
          <option value={propia.nombre}>{propia.nombre}</option>
        </optgroup>
      )}
    </>
  );

  async function subir(file: File | undefined) {
    if (!file) return;
    const archivo = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
    const nombre = file.name.replace(/\.(woff2?|ttf|otf)$/i, "").replace(/[-_]+/g, " ").trim() || "Propia";
    onChange({ ...marca, identidad: { ...marca.identidad, tipografia: { ...t, propia: { nombre, archivo, clase } } } });
  }

  function quitarPropia() {
    const reemplazo = familiaDeEjes(marca.diagnostico.ejes);
    const sinPropia = { ...t };
    delete sinPropia.propia;
    const d = display === propia?.nombre ? reemplazo : display;
    const x = texto === propia?.nombre ? null : t.familia_texto ?? null;
    onChange({ ...marca, identidad: { ...marca.identidad, tipografia: elegirPar(sinPropia, d, x, italicaRubro) } });
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Display (títulos)</span>
          <select value={display} onChange={(e) => setPar(e.target.value, t.familia_texto ?? null)} className="rounded-md border border-neutral-300 px-2 py-1.5">
            {opciones}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Texto (body, CTA, datos)</span>
          <select value={t.familia_texto ?? ""} onChange={(e) => setPar(display, e.target.value || null)} className="rounded-md border border-neutral-300 px-2 py-1.5">
            <option value="">La misma que display</option>
            {opciones}
          </select>
        </label>
        <span className={`rounded px-2 py-1 text-xs ${regla.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {regla.ok ? "✓ " : "⚠ "}
          {regla.motivo}
        </span>
      </div>
      {sugeridos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-500">Pares sugeridos para {display}:</span>
          {sugeridos.map((s) => (
            <button key={s} type="button" onClick={() => setPar(display, s)} className="rounded-full border border-neutral-300 px-3 py-1" style={{ fontFamily: fontFamily(s) }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 text-xs">
        <span className="font-medium">Fuente propia</span>
        {propia ? (
          <>
            <span style={{ fontFamily: fontFamily(propia.nombre), fontSize: 18 }}>{propia.nombre}</span>
            <span className="text-neutral-500">({CLASES.find((c) => c.id === propia.clase)?.nombre})</span>
            <button type="button" onClick={quitarPropia} className="underline">Quitar</button>
          </>
        ) : (
          <>
            <select value={clase} onChange={(e) => setClase(e.target.value as ClaseFamilia)} className="rounded-md border border-neutral-300 px-2 py-1">
              {CLASES.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5">
              Subir WOFF2
              <input type="file" accept=".woff2,.woff,.ttf,.otf" className="hidden" onChange={(e) => void subir(e.target.files?.[0])} />
            </label>
            <span className="text-neutral-500">Queda guardada en la marca y se puede elegir como display o como texto.</span>
          </>
        )}
      </div>
    </div>
  );
}
